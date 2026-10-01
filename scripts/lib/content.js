/**
 * Shared content loader for the build scripts.
 *
 * Walks src/data/{services,government}.yaml and the content/ tree the same
 * way the app does, and returns every routable page with its interpolated
 * markdown. Nested listings (e.g. departments/legislative/index.yaml) are
 * rendered to markdown so every page can be treated the same way.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.join(__dirname, '..', '..');
export const contentDir = path.join(rootDir, 'content');
export const publicDir = path.join(rootDir, 'public');

export const env = loadEnv(
  process.env.NODE_ENV || 'production',
  rootDir,
  'VITE_'
);

export const sections = [
  { dir: 'services', label: 'Services', yamlFile: 'services.yaml' },
  { dir: 'government', label: 'Government', yamlFile: 'government.yaml' },
];

export function readYaml(file) {
  return yaml.load(fs.readFileSync(file, 'utf8')) || {};
}

// Mirrors interpolate() in src/lib/markdownLoader.ts
export function interpolate(content, data = {}) {
  return content.replace(/\{([A-Z0-9_]+)\}/g, (match, key) => {
    if (key in data) return String(data[key]);
    const value = env[`VITE_${key}`];
    return value !== undefined ? String(value) : match;
  });
}

function loadCompanionJson(mdPath) {
  const jsonPath = mdPath.replace(/\.md$/, '.json');
  if (!fs.existsSync(jsonPath)) return {};
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

// Mirrors the title/description extraction in src/lib/markdownLoader.ts
function extractTitle(markdown) {
  return markdown.match(/^#\s+(.+)$/m)?.[1].trim();
}

function extractDescription(markdown) {
  return markdown
    .match(/^#\s+.+$\n\n(.+?)(?:\n\n|$)/s)?.[1]
    .replace(/^>\s*/, '')
    .trim();
}

function loadMarkdownPage(mdPath) {
  const markdown = interpolate(
    fs.readFileSync(mdPath, 'utf8'),
    loadCompanionJson(mdPath)
  );
  return {
    markdown,
    title: extractTitle(markdown),
    description: extractDescription(markdown),
  };
}

function loadListingPage(indexPath) {
  const index = readYaml(indexPath);
  const parts = [`# ${index.title}`];
  if (index.description) parts.push(index.description);
  for (const item of index.pages || []) {
    parts.push(`## ${item.name}`);
    if (item.description) parts.push(item.description);
  }
  return {
    markdown: `${parts.join('\n\n')}\n`,
    title: index.title,
    description: index.description,
  };
}

function loadPage(categoryDir, slug) {
  const mdPath = path.join(categoryDir, `${slug}.md`);
  if (fs.existsSync(mdPath)) return loadMarkdownPage(mdPath);

  const indexPath = path.join(categoryDir, slug, 'index.yaml');
  if (fs.existsSync(indexPath)) return loadListingPage(indexPath);

  return null;
}

/**
 * Returns every section, category and page in the order the site shows
 * them. Pages listed in a category's index.yaml come first (with the
 * name/description shown on the category page), followed by any markdown
 * files or nested listings the index doesn't mention. Listed slugs with no
 * content are reported in `missing`.
 */
export function collectContent() {
  const missing = [];

  const result = sections.map(section => {
    const { categories = [] } = readYaml(
      path.join(rootDir, 'src', 'data', section.yamlFile)
    );

    return {
      ...section,
      categories: categories.map(category => {
        const url = `/${section.dir}/${category.slug}`;
        const categoryDir = path.join(contentDir, section.dir, category.slug);
        const pages = [];

        if (fs.existsSync(categoryDir)) {
          const indexPath = path.join(categoryDir, 'index.yaml');
          const listed = fs.existsSync(indexPath)
            ? readYaml(indexPath).pages || []
            : [];
          const seen = new Set();

          for (const entry of listed) {
            seen.add(entry.slug);
            const page = loadPage(categoryDir, entry.slug);
            if (!page) {
              missing.push(`${url}/${entry.slug}`);
              continue;
            }
            pages.push({
              ...page,
              slug: entry.slug,
              url: `${url}/${entry.slug}`,
              name: entry.name || page.title || entry.slug,
              description: entry.description || page.description,
            });
          }

          for (const entry of fs.readdirSync(categoryDir).sort()) {
            const slug = entry.replace(/\.md$/, '');
            if (seen.has(slug) || entry === 'index.yaml') continue;
            if (!entry.endsWith('.md') && !entry.match(/^[^.]+$/)) continue;
            const page = loadPage(categoryDir, slug);
            if (!page) continue;
            seen.add(slug);
            pages.push({
              ...page,
              slug,
              url: `${url}/${slug}`,
              name: page.title || slug,
            });
          }
        }

        return {
          name: category.category,
          slug: category.slug,
          description: category.description,
          url,
          pages,
        };
      }),
    };
  });

  return { sections: result, missing };
}

/** VITE_WEBSITE_URL without a trailing slash */
export function siteUrl() {
  const url = env.VITE_WEBSITE_URL;
  if (!url) throw new Error('VITE_WEBSITE_URL is not set');
  return url.replace(/\/+$/, '');
}
