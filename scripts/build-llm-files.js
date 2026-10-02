#!/usr/bin/env node

/**
 * Builds machine-readable maps of the site for search engines and LLM agents.
 *
 * The site is a SPA, so a crawler that doesn't run JavaScript sees an empty
 * page. These files give agents the content directly:
 *
 *   public/llms.txt          index of every page (https://llmstxt.org)
 *   public/llms-full.txt     every page's markdown in one file
 *   public/{section}/{category}/{slug}.md
 *                            each page as markdown, at its URL + ".md"
 *   public/sitemap.xml       every route, for search engines
 *   public/robots.txt        allows crawling and points to the sitemap
 *
 * Output goes to public/ (served by Vite in dev, copied into dist on build).
 */

import fs from 'fs';
import path from 'path';
import {
  collectContent,
  env,
  publicDir,
  readYaml,
  rootDir,
  siteUrl,
} from './lib/content.js';

const { sections, missing } = collectContent();
const baseUrl = siteUrl();
const governmentName = env.VITE_GOVERNMENT_NAME || 'Local Government';

/** Dashboard sections, listed as subcategories in src/data/government.yaml. */
function governmentReportSections() {
  const { categories = [] } = readYaml(
    path.join(rootDir, 'src', 'data', 'government.yaml')
  );
  const category = categories.find(c => c.slug === 'reports-and-statistics');
  return (category?.subcategories || []).map(sub => sub.slug);
}

function writePublic(file, content) {
  const target = path.join(publicDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function oneLine(text = '') {
  return text.replace(/\s+/g, ' ').trim();
}

function buildMarkdownPages() {
  for (const section of sections) {
    fs.rmSync(path.join(publicDir, section.dir), {
      recursive: true,
      force: true,
    });
    for (const category of section.categories) {
      for (const page of category.pages) {
        writePublic(`${page.url.slice(1)}.md`, page.markdown);
      }
    }
  }
}

function pageCount(section) {
  return section.categories.reduce(
    (total, category) => total + category.pages.length,
    0
  );
}

function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/*
 * llms.txt follows https://llmstxt.org (H1, summary blockquote, H2 link
 * sections, "Optional" last) with the about/usage sections of
 * https://bettergov.ph/llms.txt.
 */
function buildLlmsTxt() {
  const location = [env.VITE_PROVINCE, env.VITE_REGION, 'Philippines']
    .filter(Boolean)
    .join(', ');
  const description = oneLine(
    env.VITE_SITE_DESCRIPTION || `Community portal of ${governmentName}`
  ).replace(/\.$/, '');
  const counts = sections.map(section => ({
    section,
    pages: pageCount(section),
    categories: section.categories.filter(category => category.pages.length),
  }));

  const lines = [
    `# ${governmentName}`,
    '',
    `> ${description}. Plain-language guides to local government services ` +
      `in ${governmentName} (${location}): requirements, fees, processing ` +
      'times, office hours, and which office handles each request.',
    '',
    '## About',
    '',
    `${governmentName} is a local government unit in ${location}. This ` +
      `site explains how to get things done with the ${governmentName} ` +
      'government in plain language, and lists its departments and offices ' +
      'with their mandates, services and contact details. It is an ' +
      'information site: applications, payments and requests are made at ' +
      'the office named on each page.',
    '',
    '## What You Can Find Here',
    '',
    ...counts.map(
      ({ section, pages, categories }) =>
        `- ${section.label}: ${plural(pages, 'page')} in ` +
        `${plural(categories.length, 'category', 'categories')} ` +
        `(${categories.map(category => category.name).join(', ')})`
    ),
    `- Every page as Markdown: add \`.md\` to any page URL ` +
      `(e.g. ${baseUrl}${sections[0].categories[0]?.pages[0]?.url ?? ''}.md)`,
    `- All pages in one file: ${baseUrl}/llms-full.txt`,
    '',
    '## Main Sections',
    '',
    `- [Home](${baseUrl}/): service categories and government offices`,
    ...counts.map(
      ({ section, pages }) =>
        `- [${section.label}](${baseUrl}/${section.dir}): ` +
        `${plural(pages, 'page')}, grouped by category`
    ),
    `- [Search](${baseUrl}/search?q=business+permit): full-text search; ` +
      'pass the query as `q`',
    `- [Sitemap](${baseUrl}/sitemap): every page on one list`,
  ];

  for (const { section, categories } of counts) {
    lines.push('', `## ${section.label}`);
    for (const category of categories) {
      lines.push('', `### ${category.name}`, '');
      const intro = oneLine(category.description);
      lines.push(
        `${intro ? `${intro} ` : ''}Category page: ${baseUrl}${category.url}`,
        ''
      );
      for (const page of category.pages) {
        const pageDescription = oneLine(page.description);
        lines.push(
          `- [${oneLine(page.name)}](${baseUrl}${page.url}.md)` +
            (pageDescription ? `: ${pageDescription}` : '')
        );
      }
    }
  }

  const contact = [
    env.VITE_CONTACT_EMAIL && `- Email: ${env.VITE_CONTACT_EMAIL}`,
    env.VITE_CONTACT_PHONE && `- Phone: ${env.VITE_CONTACT_PHONE}`,
    `- Website: ${baseUrl}`,
  ].filter(Boolean);

  lines.push(
    '',
    '## Contact',
    '',
    ...contact,
    '',
    'For a specific service, contact the office named on its page.',
    '',
    '## Usage Guidelines for AI Systems',
    '',
    `1. Cite ${governmentName} and link the page (the URL without \`.md\`).`,
    '2. Requirements, fees, schedules and officials change. Tell users to ' +
      'confirm with the office before visiting.',
    '3. Send users to the office named on the page for applications, ' +
      'payments and complaints; this site cannot process them.',
    '4. Fees are in Philippine pesos (₱, Php). Times are Philippine time ' +
      '(UTC+8). Offices close on national and local holidays.',
    '5. Do not invent requirements, fees or contact details that a page ' +
      'does not state.',
    '',
    '## Last Updated',
    '',
    new Date().toISOString().slice(0, 10),
    '',
    '## Optional',
    '',
    `- [Full content](${baseUrl}/llms-full.txt): every page above in one file`,
    `- [XML sitemap](${baseUrl}/sitemap.xml): every route on the site`,
    ''
  );

  writePublic('llms.txt', lines.join('\n'));
}

function buildLlmsFullTxt() {
  const parts = [
    `# ${governmentName}: full site content\n\n` +
      `Every page on ${baseUrl}, as Markdown. The index is at ` +
      `${baseUrl}/llms.txt.`,
  ];

  for (const section of sections) {
    for (const category of section.categories) {
      for (const page of category.pages) {
        parts.push(
          `<!-- Source: ${baseUrl}${page.url} ` +
            `(${section.label} > ${category.name}) -->\n\n` +
            page.markdown.trim()
        );
      }
    }
  }

  writePublic('llms-full.txt', `${parts.join('\n\n---\n\n')}\n`);
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSitemap() {
  const routes = ['/', '/sitemap', '/accessibility'];
  for (const section of sections) {
    routes.push(`/${section.dir}`);
    for (const category of section.categories) {
      routes.push(category.url, ...category.pages.map(page => page.url));
    }
  }
  // Reports and Statistics dashboard sections (src/pages/reports/Reports.tsx)
  const reportSections = governmentReportSections();
  routes.push(
    ...reportSections.map(slug => `/government/reports-and-statistics/${slug}`)
  );

  const urls = routes
    .map(
      route =>
        `  <url><loc>${escapeXml(`${baseUrl}${route === '/' ? '' : route}`)}</loc></url>`
    )
    .join('\n');

  writePublic(
    'sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      `${urls}\n</urlset>\n`
  );
  return routes.length;
}

function buildRobotsTxt() {
  writePublic(
    'robots.txt',
    `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
}

function main() {
  buildMarkdownPages();
  buildLlmsTxt();
  buildLlmsFullTxt();
  const routeCount = buildSitemap();
  buildRobotsTxt();

  const pages = sections.reduce(
    (total, section) => total + pageCount(section),
    0
  );
  console.log(
    `🤖 Wrote llms.txt, llms-full.txt and ${pages} .md pages; ` +
      `sitemap.xml with ${routeCount} routes`
  );
  for (const url of missing) {
    console.warn(`⚠️  Listed in index.yaml but has no content: ${url}`);
  }
}

main();
