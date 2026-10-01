const pesoFull = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a peso amount. `compact` abbreviates to ₱1.23B / ₱45.6M / ₱789K,
 * which is what charts and stat cards use; tables show the full amount.
 */
export function formatPeso(
  value: number | null | undefined,
  { compact = false }: { compact?: boolean } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (!compact) return pesoFull.format(value);
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const n = abs / size;
      return `${sign}₱${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)}${suffix}`;
    }
  }
  return `${sign}₱${abs.toFixed(0)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-PH');
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1
): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '—';
  return `${value.toFixed(digits)}%`;
}

/** "Q3 2025", or "2025" for annual documents. */
export function formatPeriod(year: number, quarter: number | null): string {
  return quarter ? `Q${quarter} ${year}` : String(year);
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
