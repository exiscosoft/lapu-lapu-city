import type { DocRef, SreEntry, Values } from '../../types/fdp';
import { isNumber } from '../../lib/format';

/** Total of an SRE line: the printed total, else the sum of the fund columns. */
export function lineTotal(values: Values | undefined): number | null {
  if (!values) return null;
  if (isNumber(values.total)) return values.total;
  const funds = ['generalFund', 'sef', 'trustFund']
    .map(k => values[k])
    .filter(isNumber);
  return funds.length ? funds.reduce((a, b) => a + b, 0) : null;
}

export function sreTotal(entry: SreEntry | undefined, key: string) {
  return lineTotal(entry?.lines[key]);
}

const periodRank = (e: { quarter: number | null }) => e.quarter ?? 5;

/** Chronological order; annual documents sort after Q4. */
export function byPeriod<T extends { year: number; quarter: number | null }>(
  a: T,
  b: T
) {
  return a.year - b.year || periodRank(a) - periodRank(b);
}

/**
 * The most complete report for each year: Q4 (or an annual document) when
 * published, otherwise the latest quarter. Figures are year-to-date, so the
 * latest quarter carries the whole year so far.
 */
export function latestPerYear<
  T extends { year: number; quarter: number | null },
>(entries: T[]): Map<number, T> {
  const out = new Map<number, T>();
  for (const e of entries) {
    const prev = out.get(e.year);
    if (!prev || periodRank(e) > periodRank(prev)) out.set(e.year, e);
  }
  return out;
}

export function latestForYear<
  T extends { year: number; quarter: number | null },
>(entries: T[], year: number): T | undefined {
  return latestPerYear(entries.filter(e => e.year === year)).get(year);
}

/** "as of Q3" label when a year's latest report isn't the full year. */
export function partialLabel(entry: { quarter: number | null } | undefined) {
  if (!entry || entry.quarter === null || entry.quarter === 4) return '';
  return `Jan–${['Mar', 'Jun', 'Sep'][entry.quarter - 1]} (Q${entry.quarter} year-to-date)`;
}

export function sourcesOf(entries: DocRef[]) {
  return entries.map(e => ({
    id: e.id,
    title: e.title,
    year: e.year,
    quarter: e.quarter,
    sourceUrl: e.sourceUrl,
  }));
}

export function sum(values: (number | null | undefined)[]) {
  return values.reduce<number>((a, b) => a + (isNumber(b) ? b : 0), 0);
}
