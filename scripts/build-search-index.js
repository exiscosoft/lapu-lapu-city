#!/usr/bin/env node

/**
 * Builds a Pagefind search index from the markdown content.
 *
 * The site is a SPA, so there is no rendered HTML for Pagefind to crawl.
 * Instead, each markdown page (and each nested index.yaml listing) is added
 * as a custom record, using the same URLs the router serves.
 *
 * Output: public/pagefind/ (served by Vite in dev, copied into dist on build)
 */

import fs from 'fs';
import path from 'path';
import * as pagefind from 'pagefind';
import { collectContent, publicDir } from './lib/content.js';

const outputPath = path.join(publicDir, 'pagefind');

function markdownToText(markdown) {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, '')
    .replace(/[|*_`~]/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function collectRecords() {
  const records = [];

  for (const section of collectContent().sections) {
    for (const category of section.categories) {
      for (const page of category.pages) {
        records.push({
          url: page.url,
          content: markdownToText(page.markdown),
          language: 'en',
          meta: { category: category.name, title: page.title || page.name },
          filters: { section: [section.label] },
        });
      }
    }
  }

  return records;
}

async function main() {
  const records = collectRecords();

  const { index, errors } = await pagefind.createIndex({});
  if (errors.length) throw new Error(errors.join('\n'));

  for (const record of records) {
    const result = await index.addCustomRecord(record);
    if (result.errors.length) {
      throw new Error(`${record.url}: ${result.errors.join('\n')}`);
    }
  }

  fs.rmSync(outputPath, { recursive: true, force: true });
  const write = await index.writeFiles({ outputPath });
  if (write.errors.length) throw new Error(write.errors.join('\n'));

  await pagefind.close();
  console.log(`🔎 Indexed ${records.length} pages into public/pagefind`);
}

main().catch(error => {
  console.error('❌ Failed to build search index:', error);
  process.exit(1);
});
