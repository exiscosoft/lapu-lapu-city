#!/usr/bin/env node

/**
 * Builds data/fdp/catalog.json from downloads/fdp/manifest.csv.
 *
 * The manifest is the list of Full Disclosure Policy (FDP) PDFs scraped from
 * https://lapulapucitygov.ph/fdp. Titles on that page are inconsistent
 * ("EZXPENDITURES", "Human Resource Compliment", IRA vs NTA wording), so each
 * title is classified into a stable report type here.
 *
 * Fields filled in by hand during transcription (periodPrinted, notes,
 * status) are preserved when the catalog is regenerated.
 *
 * Usage: node scripts/fdp/catalog.js
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const downloadsDir = path.join(rootDir, 'downloads', 'fdp');
const catalogFile = path.join(rootDir, 'data', 'fdp', 'catalog.json');

export const REPORT_TYPES = {
  sre: 'Statement of Receipts and Expenditures',
  'cash-flows': 'Statement of Cash Flows',
  indebtedness: 'Statement of Indebtedness, Payments and Balances',
  'development-fund-20': '20% Development Fund Utilization',
  ldrrmf: 'LDRRM Fund Utilization',
  sef: 'Special Education Fund Utilization',
  'sef-budget': 'Special Education Fund Budget',
  'trust-fund': 'Trust Fund Utilization',
  'project-status': 'Consolidated Quarterly Report on Government Projects',
  'bid-results': 'Bid Results',
  'hr-complement': 'Human Resource Complement',
  'cash-advances': 'Unliquidated Cash Advances',
  'annual-budget': 'Annual Budget',
  'procurement-plan': 'Procurement Plan',
  gad: 'Gender and Development',
  bayanihan: 'Bayanihan Grant',
  other: 'Other Documents',
};

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

// Order matters: the first matching rule wins.
const RULES = [
  [/bayanihan/i, 'bayanihan', bayanihanVariant],
  [/report on fund utilization and status/i, 'project-status'],
  [/receipts and e\w*xpenditures/i, 'sre'],
  [/debt service|indebtedness/i, 'indebtedness'],
  [/20%/, 'development-fund-20'],
  [/disaster risk|ldrrm/i, 'ldrrmf', partVariant],
  [/trust fund/i, 'trust-fund'],
  [/consolidated quarterly report/i, 'project-status'],
  [
    /annual budget of the special education|special education fund( as of [^(]+)? \(annual\)/i,
    'sef-budget',
    t => (/as of/i.test(t) ? 'may-19' : /annual budget/i.test(t) ? '' : 'sb'),
  ],
  [
    /\bsef\b|special education/i,
    'sef',
    t => (/utilization fund/i.test(t) ? 'b' : ''),
  ],
  [/bid|civil works|goods and services/i, 'bid-results', bidVariant],
  [/resource co|manpower/i, 'hr-complement', asOfVariant],
  [/cash flow/i, 'cash-flows'],
  [/cash adv|casd adv/i, 'cash-advances'],
  [
    /procurement plan/i,
    'procurement-plan',
    t => (/supplemental/i.test(t) ? 'supplemental' : ''),
  ],
  [/gender\s*(and|&)\s*development|\(gad\)/i, 'gad'],
  [
    /annual\s+budget report|local budget preparation|local expenditure program|general fund proper|market and slaughterhouse|operation of hospitals/i,
    'annual-budget',
    budgetVariant,
  ],
];

function bayanihanVariant(title) {
  const month = MONTHS.find(m => new RegExp(m, 'i').test(title));
  const kind = /provinces/i.test(title) ? 'provinces' : 'cities';
  return `${kind}-${month || 'na'}`;
}

function partVariant(title) {
  const m = title.match(/part\s+(iv|i{1,3}|\d)\b/i);
  if (!m) return '';
  const roman = { i: 1, ii: 2, iii: 3, iv: 4 };
  return `part-${roman[m[1].toLowerCase()] || m[1]}`;
}

function bidVariant(title) {
  const t = title.toLowerCase();
  const kinds = [
    /civil works/.test(t) && 'civil-works',
    /goods/.test(t) && 'goods-services',
    /consulting/.test(t) && 'consulting',
  ].filter(Boolean);
  return kinds.length > 1 ? 'combined' : kinds[0] || '';
}

function asOfVariant(title) {
  const m = title.match(/as of (\w+)/i);
  return m ? m[1].toLowerCase() : '';
}

function budgetVariant(title) {
  if (/local expenditure program/i.test(title)) return 'lep';
  if (/general fund proper/i.test(title)) return 'general-fund';
  if (/market and slaughterhouse/i.test(title)) return 'market-slaughterhouse';
  if (/hospitals/i.test(title)) return 'hospitals';
  return partVariant(title);
}

function classify(title) {
  for (const [re, type, variantFn] of RULES) {
    if (re.test(title))
      return { type, variant: variantFn ? variantFn(title) : '' };
  }
  return { type: 'other', variant: 'rfq' };
}

function parsePeriod(title, year) {
  const q = title.match(/\((1st|2nd|3rd|4th) Quarter\)\s*$/i);
  const quarter = q ? Number(q[1][0]) : null;
  let asOf = null;
  const m = title.match(
    /as\s*of\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{1,2}(?!\d))?\s*,?\s*(\d{4})?/i
  );
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    const day = m[2]
      ? Number(m[2])
      : new Date(Number(m[3] || year), month, 0).getDate();
    asOf = `${m[3] || year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return { quarter, asOf };
}

function readCsv(file) {
  const [header, ...lines] = fs
    .readFileSync(file, 'utf8')
    .trim()
    .split(/\r?\n/);
  const cols = header.split(',');
  return lines.map(line => {
    const cells = [];
    let cur = '';
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) {
        cells.push(cur);
        cur = '';
      } else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

function pageCount(file) {
  try {
    const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
    return Number(info.match(/^Pages:\s+(\d+)/m)?.[1]) || null;
  } catch {
    return null;
  }
}

function main() {
  const manifest = readCsv(path.join(downloadsDir, 'manifest.csv'));
  const previous = fs.existsSync(catalogFile)
    ? Object.fromEntries(
        JSON.parse(fs.readFileSync(catalogFile, 'utf8')).documents.map(d => [
          d.id,
          d,
        ])
      )
    : {};

  const seen = new Map();
  const hashes = new Map();
  const documents = manifest.map(row => {
    const year = Number(row.year);
    const { type, variant } = classify(row.title);
    const { quarter, asOf } = parsePeriod(row.title, year);
    const period = quarter ? `q${quarter}` : 'annual';
    let id = [year, period, type, variant].filter(Boolean).join('-');
    const n = (seen.get(id) || 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;

    const pdf = path.join(downloadsDir, row.file);
    let duplicateOf;
    if (fs.existsSync(pdf)) {
      const hash = execFileSync('shasum', [pdf], { encoding: 'utf8' }).split(
        ' '
      )[0];
      duplicateOf = hashes.get(hash);
      if (!duplicateOf) hashes.set(hash, id);
    }

    const prev = previous[id] || {};
    return {
      id,
      type,
      year,
      quarter,
      asOf,
      periodPrinted: prev.periodPrinted ?? null,
      title: row.title
        .replace(/\s*\((\d\w\w Quarter|Annual)\)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim(),
      file: row.file,
      sourceUrl: row.url,
      pages: fs.existsSync(pdf) ? pageCount(pdf) : (prev.pages ?? null),
      status: prev.status ?? 'pending',
      ...(duplicateOf && { duplicateOf }),
      ...(prev.notes && { notes: prev.notes }),
    };
  });

  documents.sort(
    (a, b) =>
      b.year - a.year ||
      (b.quarter ?? 5) - (a.quarter ?? 5) ||
      a.type.localeCompare(b.type) ||
      a.id.localeCompare(b.id)
  );

  fs.mkdirSync(path.dirname(catalogFile), { recursive: true });
  fs.writeFileSync(
    catalogFile,
    JSON.stringify(
      {
        source: 'https://lapulapucitygov.ph/fdp',
        types: REPORT_TYPES,
        documents,
      },
      null,
      2
    ) + '\n'
  );

  const counts = {};
  for (const d of documents) counts[d.type] = (counts[d.type] || 0) + 1;
  console.log(`catalog.json: ${documents.length} documents`);
  console.table(counts);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
