#!/usr/bin/env node

/**
 * Builds the Reports & Statistics dashboard data from the FDP transcriptions.
 *
 * Reads data/fdp/catalog.json and data/fdp/json/{type}/{id}.json and writes
 * (generated, gitignored) files to public/data/fdp/:
 *
 *   catalog.json       every document with its transcription status
 *   finances.json      Statement of Receipts and Expenditures time series
 *   funds.json         20% Development Fund, LDRRMF, SEF, Trust Fund
 *   procurement.json   every bid result row, flattened
 *   workforce.json     Human Resource Complement by quarter
 *   debt.json          loans and outstanding balances
 *   budget.json        annual budget office totals (line items in docs/)
 *   docs/{id}.json     each full transcription
 *   md/{id}.md         each transcription rendered as markdown
 *
 * Every dataset uses { metadata: {...}, data }.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDocuments } from './validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const fdpDir = path.join(rootDir, 'data', 'fdp');
const outDir = path.join(rootDir, 'public', 'data', 'fdp');
const SOURCE =
  'Lapu-Lapu City Full Disclosure Policy documents (https://lapulapucitygov.ph/fdp)';

const catalog = JSON.parse(
  fs.readFileSync(path.join(fdpDir, 'catalog.json'), 'utf8')
);
const catalogById = new Map(catalog.documents.map(d => [d.id, d]));
const docs = loadDocuments()
  .filter(d => d.doc && catalogById.has(d.doc.id))
  .map(d => d.doc);
const generatedAt = new Date().toISOString();

function write(file, data) {
  const target = path.join(outDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(
    target,
    typeof data === 'string' ? data : JSON.stringify(data)
  );
}

function dataset(title, data, extra = {}) {
  return { metadata: { title, source: SOURCE, generatedAt, ...extra }, data };
}

/** Period and source reference shared by every dataset row. */
function ref(doc) {
  const entry = catalogById.get(doc.id);
  return {
    id: doc.id,
    year: doc.period.year,
    quarter: doc.period.quarter,
    asOf: doc.period.asOf || null,
    title: entry.title,
    sourceUrl: entry.sourceUrl,
  };
}

const titleCase = text =>
  text
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();

const byPeriod = (a, b) =>
  a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5);
const ofType = (...types) => docs.filter(d => types.includes(d.type));
const table = (doc, key) => doc.tables.find(t => t.key === key);

// ---------------------------------------------------------------- finances
function buildFinances() {
  return ofType('sre')
    .map(doc => {
      const main = table(doc, 'main');
      const lines = {};
      for (const row of main?.rows || []) {
        if (row.key && !lines[row.key]) lines[row.key] = row.values;
      }
      const assets = doc.tables
        .flatMap(t => t.rows)
        .find(r => r.key === 'totalAssets');
      return {
        ...ref(doc),
        cumulative: doc.period.cumulative !== false,
        columns: (main?.columns || []).map(c => c.key),
        lines,
        totalAssets: assets
          ? (Object.values(assets.values).find(v => typeof v === 'number') ??
            null)
          : null,
        notes: doc.notes || [],
      };
    })
    .sort(byPeriod);
}

// ---------------------------------------------------------------- funds
function projectRows(doc) {
  const t = table(doc, 'projects') || doc.tables[0];
  return (t?.rows || [])
    .filter(r => (r.kind || 'item') === 'item')
    .map(r => ({
      name: r.values.program || r.label,
      section: r.section || null,
      appropriation: r.appropriation || null,
      location: r.values.location ?? null,
      totalCost: r.values.totalCost ?? null,
      dateStarted: r.values.dateStarted ?? null,
      targetCompletion: r.values.targetCompletion ?? null,
      pctCompletion: r.values.pctCompletion ?? null,
      costIncurred: r.values.costIncurred ?? null,
      remarks: r.values.remarks ?? null,
    }));
}

function sumOf(rows, key) {
  return rows.reduce(
    (acc, r) => acc + (typeof r[key] === 'number' ? r[key] : 0),
    0
  );
}

function buildFunds() {
  const projectFund = type =>
    ofType(type)
      .map(doc => {
        const projects = projectRows(doc);
        return {
          ...ref(doc),
          summary: {
            totalCost: doc.summary?.totalCost ?? sumOf(projects, 'totalCost'),
            costIncurred:
              doc.summary?.costIncurred ?? sumOf(projects, 'costIncurred'),
            projectCount: doc.summary?.projectCount ?? projects.length,
          },
          projects,
          notes: doc.notes || [],
        };
      })
      .sort(byPeriod);

  const LDRRMF_FUNDS = [
    'qrf',
    'mitigation',
    'ndrrmf',
    'otherLgu',
    'otherSources',
  ];
  const ldrrmfAmount = values => {
    if (typeof values.amount === 'number') return values.amount;
    if (typeof values.total === 'number') return values.total;
    const parts = LDRRMF_FUNDS.map(k => values[k]).filter(
      v => typeof v === 'number'
    );
    return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
  };
  const ldrrmf = ofType('ldrrmf')
    .map(doc => {
      const util = table(doc, 'utilization');
      const textCol = util?.columns.find(
        c => c.type === 'text' && c.key !== 'month' && c.key !== 'date'
      )?.key;
      // The month is printed once per group, on the group's first row.
      let month = null;
      let monthSection;
      return {
        ...ref(doc),
        summary: doc.summary || {},
        sources: (table(doc, 'sources')?.rows || [])
          .filter(r => r.kind !== 'header')
          .map(r => ({
            key: r.key || null,
            label: r.label,
            kind: r.kind || 'item',
            values: r.values,
          })),
        utilization: (util?.rows || [])
          .filter(r => (r.kind || 'item') === 'item')
          .map(r => {
            if (r.section !== monthSection) month = null;
            monthSection = r.section;
            if (r.values.month) month = titleCase(String(r.values.month));
            return {
              item: (textCol && r.values[textCol]) || r.label,
              month,
              fund:
                LDRRMF_FUNDS.find(k => typeof r.values[k] === 'number') || null,
              amount: ldrrmfAmount(r.values),
            };
          }),
        notes: doc.notes || [],
      };
    })
    .sort(byPeriod);

  const sef = ofType('sef')
    .map(doc => ({
      ...ref(doc),
      summary: doc.summary || {},
      lines: (table(doc, 'main')?.rows || [])
        .filter(
          r =>
            (r.kind || 'item') === 'item' &&
            typeof r.values?.amount === 'number'
        )
        .map(r => ({
          label: r.label,
          section: r.section || null,
          amount: r.values.amount,
        })),
      notes: doc.notes || [],
    }))
    .sort(byPeriod);

  return {
    developmentFund: projectFund('development-fund-20'),
    trustFund: projectFund('trust-fund'),
    projectStatus: projectFund('project-status'),
    ldrrmf,
    sef,
  };
}

// ---------------------------------------------------------------- procurement
const FORM_CATEGORY = {
  civilWorks: 'Civil Works',
  goodsServices: 'Goods and Services',
  consulting: 'Consulting Services',
};

function categoryFor(doc, tableKey) {
  if (FORM_CATEGORY[tableKey]) return FORM_CATEGORY[tableKey];
  const id = doc.id;
  if (id.includes('civil-works')) return 'Civil Works';
  if (id.includes('goods-services')) return 'Goods and Services';
  if (id.includes('consulting')) return 'Consulting Services';
  return 'Mixed';
}

function buildProcurement() {
  const rows = [];
  for (const doc of ofType('bid-results').sort(byPeriod)) {
    const r0 = ref(doc);
    for (const t of doc.tables) {
      for (const r of t.rows) {
        if ((r.kind || 'item') !== 'item') continue;
        const v = r.values || {};
        if (!v.description && !v.bidder && v.abc == null && v.bidAmount == null)
          continue;
        rows.push({
          docId: r0.id,
          year: r0.year,
          quarter: r0.quarter,
          sourceUrl: r0.sourceUrl,
          category: categoryFor(doc, t.key),
          refNo: v.refNo ?? null,
          description: v.description || r.label || '',
          location: v.location ?? null,
          abc: v.abc ?? null,
          bidder: v.bidderNormalized || v.bidder || null,
          bidderAddress: v.bidderAddress ?? null,
          bidAmount: v.bidAmount ?? null,
          biddingDate: v.biddingDate ?? null,
          duration: v.duration ?? null,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------- workforce
function buildWorkforce() {
  return ofType('hr-complement')
    .map(doc => {
      const t = table(doc, 'main');
      return {
        ...ref(doc),
        columns: (t?.columns || []).map(c => ({
          key: c.key,
          label: c.label,
          type: c.type,
        })),
        rows: (t?.rows || [])
          .filter(r => r.kind !== 'header')
          .map(r => ({
            key: r.key || null,
            label: r.label,
            kind: r.kind || 'item',
            values: r.values,
          })),
        notes: doc.notes || [],
      };
    })
    .sort(byPeriod);
}

// ---------------------------------------------------------------- debt
function buildDebt() {
  return ofType('indebtedness')
    .map(doc => ({
      ...ref(doc),
      loans: doc.summary?.loans || [],
      totalOutstanding:
        doc.summary?.totalOutstanding ??
        (doc.summary?.loans || []).reduce(
          (a, l) => a + (l.outstanding || 0),
          0
        ),
      notes: doc.notes || [],
    }))
    .sort(byPeriod);
}

// ---------------------------------------------------------------- budget
function buildBudget() {
  return ofType('annual-budget', 'sef-budget')
    .map(doc => ({
      ...ref(doc),
      type: doc.type,
      offices: doc.summary?.offices || [],
      summary: doc.type === 'sef-budget' ? doc.summary || {} : undefined,
      tableCount: doc.tables.length,
      notes: doc.notes || [],
    }))
    .sort(byPeriod);
}

// ---------------------------------------------------------------- catalog
function buildCatalog() {
  const transcribed = new Map(docs.map(d => [d.id, d]));
  return {
    types: catalog.types,
    documents: catalog.documents.map(entry => {
      const doc = transcribed.get(entry.id);
      return {
        id: entry.id,
        type: entry.type,
        title: entry.title,
        year: doc?.period.year ?? entry.year,
        quarter: doc ? doc.period.quarter : entry.quarter,
        publishedYear: entry.year,
        publishedQuarter: entry.quarter,
        periodPrinted: doc?.period.printed ?? null,
        pages: entry.pages,
        sourceUrl: entry.sourceUrl,
        transcribed: Boolean(doc),
        duplicateOf: entry.duplicateOf ?? null,
        notes: doc?.notes || [],
      };
    }),
  };
}

// ---------------------------------------------------------------- markdown
function formatCell(value, type) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && type === 'amount')
    return value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (typeof value === 'number' && type === 'percent') return `${value}%`;
  if (typeof value === 'number') return value.toLocaleString('en-PH');
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function toMarkdown(doc) {
  const entry = catalogById.get(doc.id);
  const lines = [
    '---',
    `id: ${doc.id}`,
    `type: ${doc.type}`,
    `period: ${JSON.stringify(doc.period.printed)}`,
    `source: ${entry.sourceUrl}`,
    '---',
    '',
    `# ${doc.title}`,
    '',
    `**Period:** ${doc.period.printed}  `,
    `**Source:** [${entry.title} (PDF)](${entry.sourceUrl})`,
    '',
  ];
  for (const t of doc.tables) {
    if (doc.tables.length > 1 || t.title)
      lines.push(`## ${t.title || t.key}`, '');
    const cols = t.columns;
    const hasLabelCol = !cols.some(c =>
      ['program', 'description', 'object', 'particulars'].includes(c.key)
    );
    const headers = [
      ...(hasLabelCol ? ['Particulars'] : []),
      ...cols.map(c => c.label),
    ];
    lines.push(`| ${headers.join(' | ')} |`);
    lines.push(
      `| ${headers.map((_, i) => (i === 0 && hasLabelCol ? '---' : cols[hasLabelCol ? i - 1 : i]?.type === 'amount' ? '---:' : '---')).join(' | ')} |`
    );
    for (const r of t.rows) {
      const indent = '  '.repeat(r.level || 0);
      const label =
        r.kind === 'total' || r.kind === 'subtotal' || r.kind === 'header'
          ? `**${r.label}**`
          : r.label;
      const cells = cols.map(c => formatCell(r.values?.[c.key], c.type));
      lines.push(
        `| ${[...(hasLabelCol ? [indent + formatCell(label)] : []), ...cells].join(' | ')} |`
      );
    }
    lines.push('');
  }
  if (doc.certifiedBy?.length) {
    lines.push(
      '**Certified by:** ' +
        doc.certifiedBy.map(c => `${c.name}, ${c.position}`).join('; '),
      ''
    );
  }
  if (doc.notes?.length) {
    lines.push(
      '## Transcription notes',
      '',
      ...doc.notes.map(n => `- ${n}`),
      ''
    );
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------- main
fs.rmSync(outDir, { recursive: true, force: true });
const finances = buildFinances();
const funds = buildFunds();
const procurement = buildProcurement();
const workforce = buildWorkforce();
const debt = buildDebt();
const budget = buildBudget();

write('catalog.json', dataset('FDP document catalog', buildCatalog()));
write(
  'finances.json',
  dataset('Statement of Receipts and Expenditures', finances, {
    unit: 'PHP',
    cumulative: true,
  })
);
write('funds.json', dataset('Fund utilization', funds, { unit: 'PHP' }));
write('procurement.json', dataset('Bid results', procurement, { unit: 'PHP' }));
write(
  'workforce.json',
  dataset('Human Resource Complement', workforce, { unit: 'PHP' })
);
write('debt.json', dataset('Statement of Indebtedness', debt, { unit: 'PHP' }));
write('budget.json', dataset('Annual budget', budget, { unit: 'PHP' }));
for (const doc of docs) {
  write(`docs/${doc.id}.json`, doc);
  write(`md/${doc.id}.md`, toMarkdown(doc));
}

console.log(
  `FDP data: ${docs.length}/${catalog.documents.length} documents transcribed → ` +
    `${finances.length} SRE, ${procurement.length} bid rows, ${workforce.length} HR, ` +
    `${debt.length} debt, ${budget.length} budget docs in public/data/fdp/`
);
