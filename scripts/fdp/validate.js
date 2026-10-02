#!/usr/bin/env node

/**
 * Validates the FDP transcriptions in data/fdp/json/ against the conventions
 * in data/fdp/README.md and checks the arithmetic printed on each form.
 *
 * Errors are structural problems (bad envelope, wrong types). Warnings are
 * arithmetic mismatches: they usually mean a mis-read digit, but can be errors
 * in the source document. A warning is cleared by fixing the value or by
 * explaining the mismatch in the document's `notes`.
 *
 * Usage: node scripts/fdp/validate.js [id-regex] [--report]
 *   --report  also writes data/fdp/validation-report.md
 * Exits non-zero when there are errors.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const fdpDir = path.join(rootDir, 'data', 'fdp');
const jsonDir = path.join(fdpDir, 'json');

const COLUMN_TYPES = ['amount', 'number', 'percent', 'text', 'date'];
const ROW_KINDS = ['item', 'subtotal', 'total', 'header'];
const TOLERANCE = 1; // pesos; printed figures are rounded to centavos

export function loadDocuments(pattern = '.') {
  if (!fs.existsSync(jsonDir)) return [];
  const re = new RegExp(pattern);
  const docs = [];
  for (const type of fs.readdirSync(jsonDir)) {
    const dir = path.join(jsonDir, type);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const id = file.replace(/\.json$/, '');
      if (!re.test(id)) continue;
      const full = path.join(dir, file);
      try {
        docs.push({
          file: full,
          dir: type,
          doc: JSON.parse(fs.readFileSync(full, 'utf8')),
        });
      } catch (err) {
        docs.push({ file: full, dir: type, parseError: err.message });
      }
    }
  }
  return docs;
}

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const near = (a, b) => Math.abs(a - b) <= TOLERANCE;
const fmt = n =>
  isNum(n)
    ? n.toLocaleString('en-PH', { minimumFractionDigits: 2 })
    : String(n);

function checkStructure(doc, dir, catalogById, errors) {
  const entry = catalogById.get(doc.id);
  if (!entry) errors.push(`id "${doc.id}" is not in catalog.json`);
  else if (entry.type !== doc.type)
    errors.push(`type "${doc.type}" differs from catalog type "${entry.type}"`);
  if (doc.type !== dir)
    errors.push(`stored under json/${dir}/ but type is "${doc.type}"`);
  if (!doc.title) errors.push('missing title');

  const p = doc.period;
  if (!p || !Number.isInteger(p.year))
    errors.push('period.year must be an integer');
  else {
    if (p.quarter !== null && ![1, 2, 3, 4].includes(p.quarter))
      errors.push('period.quarter must be 1-4 or null');
    if (!p.printed) errors.push('period.printed is required');
  }

  if (!Array.isArray(doc.tables) || doc.tables.length === 0) {
    errors.push('tables must be a non-empty array');
    return;
  }
  const tableKeys = new Set();
  doc.tables.forEach((t, ti) => {
    const where = `tables[${ti}]`;
    if (!t.key) errors.push(`${where}.key is required`);
    if (tableKeys.has(t.key))
      errors.push(`${where}.key "${t.key}" is duplicated`);
    tableKeys.add(t.key);
    if (!Array.isArray(t.columns) || !t.columns.length) {
      errors.push(`${where}.columns must be a non-empty array`);
      return;
    }
    const colTypes = new Map();
    for (const c of t.columns) {
      if (!c.key || !c.label)
        errors.push(`${where} column needs key and label`);
      if (!COLUMN_TYPES.includes(c.type))
        errors.push(`${where} column "${c.key}" has bad type "${c.type}"`);
      colTypes.set(c.key, c.type);
    }
    (t.rows || []).forEach((r, ri) => {
      const rw = `${where}.rows[${ri}]`;
      if (typeof r.label !== 'string')
        errors.push(`${rw}.label must be a string`);
      if (r.kind && !ROW_KINDS.includes(r.kind))
        errors.push(`${rw}.kind "${r.kind}" is invalid`);
      for (const [k, v] of Object.entries(r.values || {})) {
        const type = colTypes.get(k);
        if (!type) {
          errors.push(`${rw}.values.${k} has no matching column`);
          continue;
        }
        if (v === null) continue;
        if (['amount', 'number', 'percent'].includes(type) && !isNum(v))
          errors.push(
            `${rw}.values.${k} should be a number, got ${JSON.stringify(v)}`
          );
        if (
          ['text', 'date'].includes(type) &&
          typeof v !== 'string' &&
          !isNum(v)
        )
          errors.push(
            `${rw}.values.${k} should be text, got ${JSON.stringify(v)}`
          );
      }
    });
  });
}

/** Sum of the listed keyed rows for one column, or null if any is missing. */
function rowsByKey(table) {
  const map = new Map();
  for (const r of table?.rows || [])
    if (r.key && !map.has(r.key)) map.set(r.key, r);
  return map;
}

function checkSum(warnings, label, total, parts) {
  if (!isNum(total) || parts.some(p => !isNum(p))) return;
  const sum = parts.reduce((a, b) => a + b, 0);
  if (!near(sum, total))
    warnings.push(
      `${label}: parts sum to ${fmt(sum)} but printed total is ${fmt(total)} (diff ${fmt(sum - total)})`
    );
}

function checkSre(doc, warnings) {
  const main = doc.tables.find(t => t.key === 'main');
  if (!main) return warnings.push('sre: no "main" table');
  const rows = rowsByKey(main);
  const required = [
    'totalCurrentOperatingIncome',
    'totalCurrentOperatingExpenditures',
    'nta',
    'localSources',
    'externalSources',
  ];
  for (const k of required)
    if (!rows.has(k)) warnings.push(`sre: missing canonical row "${k}"`);
  const cols = main.columns
    .map(c => c.key)
    .filter(k =>
      [
        'target',
        'generalFund',
        'sef',
        'trustFund',
        'trustLiability',
        'total',
      ].includes(k)
    );
  const v = (key, col) => rows.get(key)?.values?.[col];

  const rules = [
    ['taxRevenue', ['realPropertyTax', 'taxOnBusiness', 'otherTaxes']],
    [
      'nonTaxRevenue',
      [
        'regulatoryFees',
        'serviceCharges',
        'economicEnterprises',
        'otherReceipts',
      ],
    ],
    ['localSources', ['taxRevenue', 'nonTaxRevenue']],
    [
      'externalSources',
      ['nta', 'otherShares', 'interLocalTransfers', 'grants'],
    ],
    ['totalCurrentOperatingIncome', ['localSources', 'externalSources']],
    [
      'totalCurrentOperatingExpenditures',
      [
        'generalPublicServices',
        'education',
        'health',
        'labor',
        'housing',
        'socialWelfare',
        'economicServices',
        'debtServiceInterest',
      ],
    ],
    [
      'capitalInvestmentExpenditures',
      ['capitalOutlay', 'investmentOutlay', 'loansToOtherEntities'],
    ],
    ['debtServicePrincipal', ['loanAmortization', 'bondRedemption']],
    [
      'totalNonOperatingExpenditures',
      [
        'capitalInvestmentExpenditures',
        'debtServicePrincipal',
        'otherNonOperatingExpenditures',
      ],
    ],
  ];
  for (const col of cols) {
    for (const [total, parts] of rules) {
      if (!rows.has(total)) continue;
      const present = parts.filter(p => rows.has(p));
      if (!present.length) continue;
      checkSum(
        warnings,
        `sre ${total} [${col}]`,
        v(total, col),
        present.map(p => v(p, col) ?? 0)
      );
    }
  }
  // GF + SEF (+ trust) = total, for the income and expenditure lines
  if (cols.includes('total') && cols.includes('generalFund')) {
    const funds = cols.filter(c =>
      ['generalFund', 'sef', 'trustFund', 'trustLiability'].includes(c)
    );
    for (const key of [
      'totalCurrentOperatingIncome',
      'totalCurrentOperatingExpenditures',
      'nta',
      'realPropertyTax',
    ]) {
      if (rows.has(key))
        checkSum(
          warnings,
          `sre ${key} [funds→total]`,
          v(key, 'total'),
          funds.map(f => v(key, f) ?? 0)
        );
    }
  }
}

function checkGroupedTable(doc, table, amountCols, warnings) {
  // Every subtotal must equal the items of its section; the total must equal
  // the subtotals (or all items when there are no subtotals).
  const items = table.rows.filter(r => (r.kind || 'item') === 'item');
  const subtotals = table.rows.filter(r => r.kind === 'subtotal');
  const total = table.rows.find(r => r.kind === 'total');
  for (const col of amountCols) {
    for (const st of subtotals) {
      if (!st.section) continue;
      const parts = items
        .filter(r => r.section === st.section)
        .map(r => r.values?.[col] ?? 0);
      if (parts.length)
        checkSum(
          warnings,
          `${doc.type} ${table.key} subtotal "${st.label}" [${col}]`,
          st.values?.[col],
          parts
        );
    }
    if (total) {
      const parts = (subtotals.length ? subtotals : items).map(
        r => r.values?.[col] ?? 0
      );
      checkSum(
        warnings,
        `${doc.type} ${table.key} total [${col}]`,
        total.values?.[col],
        parts
      );
    }
  }
}

function checkProjects(doc, warnings) {
  const t = doc.tables.find(x => x.key === 'projects');
  if (!t) return warnings.push(`${doc.type}: no "projects" table`);
  checkGroupedTable(
    doc,
    t,
    ['totalCost', 'costIncurred'].filter(c => t.columns.some(x => x.key === c)),
    warnings
  );
  for (const r of t.rows) {
    const pct = r.values?.pctCompletion;
    if (isNum(pct) && (pct < 0 || pct > 100))
      warnings.push(
        `${doc.type}: pctCompletion ${pct} out of range in "${r.label}"`
      );
  }
}

function checkHr(doc, warnings) {
  const t = doc.tables.find(x => x.key === 'main');
  if (!t) return warnings.push('hr-complement: no "main" table');
  const total = t.rows.find(r => r.key === 'total' || r.kind === 'total');
  const items = t.rows.filter(
    r => r !== total && (r.kind || 'item') === 'item'
  );
  for (const c of t.columns.filter(c =>
    ['amount', 'number'].includes(c.type)
  )) {
    if (total)
      checkSum(
        warnings,
        `hr total [${c.key}]`,
        total.values?.[c.key],
        items.map(r => r.values?.[c.key] ?? 0)
      );
  }
  for (const r of t.rows) {
    const { salaries, otherBenefits, total: rowTotal } = r.values || {};
    if ([salaries, otherBenefits, rowTotal].every(isNum))
      checkSum(warnings, `hr row "${r.label}" salaries+benefits`, rowTotal, [
        salaries,
        otherBenefits,
      ]);
  }
}

function checkSef(doc, warnings) {
  const s = doc.summary || {};
  checkSum(warnings, 'sef totalDisbursements', s.totalDisbursements, [
    s.ps ?? 0,
    s.mooe ?? 0,
    s.capitalOutlay ?? 0,
  ]);
  if ([s.receipts, s.totalDisbursements, s.balance].every(isNum))
    checkSum(warnings, 'sef receipts - disbursements = balance', s.receipts, [
      s.totalDisbursements,
      s.balance,
    ]);
}

function checkBids(doc, warnings) {
  for (const t of doc.tables) {
    for (const r of t.rows) {
      const { abc, bidAmount } = r.values || {};
      if (isNum(abc) && isNum(bidAmount) && bidAmount > abc + TOLERANCE)
        warnings.push(
          `bid-results ${t.key}: bid ${fmt(bidAmount)} exceeds ABC ${fmt(abc)} for "${(r.values.description || r.label).slice(0, 60)}"`
        );
    }
  }
}

function checkBudget(doc, warnings) {
  for (const o of doc.summary?.offices || []) {
    checkSum(
      warnings,
      `annual-budget office "${o.office}" PS+MOOE+CO`,
      o.total,
      [o.ps ?? 0, o.mooe ?? 0, o.capitalOutlay ?? 0]
    );
  }
  for (const t of doc.tables) {
    const col = t.columns.find(c => c.key === 'budgetYear')
      ? 'budgetYear'
      : null;
    if (col) checkGroupedTable(doc, t, [col], warnings);
  }
}

function checkLdrrmf(doc, warnings) {
  const s = doc.summary || {};
  if ([s.totalAvailable, s.totalUtilized, s.balance].every(isNum))
    checkSum(
      warnings,
      'ldrrmf available - utilized = balance',
      s.totalAvailable,
      [s.totalUtilized, s.balance]
    );
}

const TYPE_CHECKS = {
  sre: checkSre,
  'development-fund-20': checkProjects,
  'trust-fund': checkProjects,
  'project-status': checkProjects,
  'hr-complement': checkHr,
  sef: checkSef,
  'bid-results': checkBids,
  'annual-budget': checkBudget,
  ldrrmf: checkLdrrmf,
};

function main() {
  const args = process.argv.slice(2);
  const writeReport = args.includes('--report');
  const pattern = args.find(a => !a.startsWith('--')) || '.';
  const catalog = JSON.parse(
    fs.readFileSync(path.join(fdpDir, 'catalog.json'), 'utf8')
  );
  const catalogById = new Map(catalog.documents.map(d => [d.id, d]));

  const results = loadDocuments(pattern).map(
    ({ file, dir, doc, parseError }) => {
      const errors = [];
      const warnings = [];
      if (parseError) errors.push(`invalid JSON: ${parseError}`);
      else {
        if (path.basename(file, '.json') !== doc.id)
          errors.push(`file name does not match id "${doc.id}"`);
        checkStructure(doc, dir, catalogById, errors);
        if (!errors.length) TYPE_CHECKS[doc.type]?.(doc, warnings);
      }
      return {
        id: path.basename(file, '.json'),
        type: dir,
        errors,
        warnings,
        notes: doc?.notes || [],
      };
    }
  );

  let errorCount = 0;
  let warnCount = 0;
  for (const r of results) {
    if (!r.errors.length && !r.warnings.length) continue;
    console.log(`\n${r.id}`);
    for (const e of r.errors) console.log(`  ERROR ${e}`);
    for (const w of r.warnings) console.log(`  warn  ${w}`);
    errorCount += r.errors.length;
    warnCount += r.warnings.length;
  }
  const transcribed = new Set(results.map(r => r.id));
  const pending = catalog.documents.filter(
    d => !d.duplicateOf && !transcribed.has(d.id)
  );
  console.log(
    `\n${results.length} documents checked: ${errorCount} errors, ${warnCount} warnings. ${pending.length} not yet transcribed.`
  );

  if (writeReport) {
    const lines = [
      '# FDP validation report',
      '',
      'Generated by `node scripts/fdp/validate.js --report`. Warnings are arithmetic',
      'mismatches between printed parts and printed totals. Each remaining one has',
      'been checked against the page image; see the document `notes` for the reason.',
      '',
      `- Documents transcribed: ${results.length} of ${catalog.documents.filter(d => !d.duplicateOf).length}`,
      `- Errors: ${errorCount}`,
      `- Warnings: ${warnCount}`,
      '',
    ];
    for (const r of results.filter(r => r.errors.length || r.warnings.length)) {
      lines.push(`## ${r.id}`, '');
      for (const e of r.errors) lines.push(`- **Error:** ${e}`);
      for (const w of r.warnings) lines.push(`- ${w}`);
      for (const n of r.notes) lines.push(`- _Note:_ ${n}`);
      lines.push('');
    }
    if (pending.length) {
      lines.push('## Not yet transcribed', '');
      for (const d of pending) lines.push(`- ${d.id}`);
      lines.push('');
    }
    fs.writeFileSync(
      path.join(fdpDir, 'validation-report.md'),
      lines.join('\n')
    );
  }
  process.exit(errorCount ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
