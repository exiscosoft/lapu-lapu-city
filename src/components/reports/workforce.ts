import { isNumber } from '../../lib/format';
import type { KeyedRow, WorkforceEntry } from '../../types/fdp';

// Human Resource Complement helpers shared by the overview and Workforce section.

export const STATUS = [
  { key: 'permanent', label: 'Permanent' },
  { key: 'elective', label: 'Elective' },
  { key: 'coterminous', label: 'Coterminous' },
  { key: 'temporary', label: 'Temporary' },
  { key: 'casual', label: 'Casual' },
  { key: 'contractual', label: 'Contractual' },
  { key: 'jobOrder', label: 'Job order / contract of service' },
];

export const num = (row: KeyedRow | undefined, col: string) => {
  const v = row?.values[col];
  return isNumber(v) ? v : null;
};

export function rowsOf(entry: WorkforceEntry) {
  const byKey = new Map(entry.rows.map(r => [r.key, r]));
  const total = byKey.get('total') ?? entry.rows.find(r => r.kind === 'total');
  return { byKey, total };
}

/** Printed grand-total headcount, or the sum of the status rows when blank. */
export function headcountOf(entry: WorkforceEntry): number | null {
  const { byKey, total } = rowsOf(entry);
  const printed = num(total, 'count');
  if (printed !== null) return printed;
  const parts = STATUS.map(s => num(byKey.get(s.key), 'count')).filter(
    isNumber
  );
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}
