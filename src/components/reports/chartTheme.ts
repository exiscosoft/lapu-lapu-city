import { formatPeso } from '../../lib/format';

// Hex values of the theme tokens in src/index.css (SVG fills can't rely on
// CSS variables in every browser).
export const COLORS = {
  primary: '#0066eb',
  primaryDark: '#003d8d',
  primaryLight: '#99c2f7',
  secondary: '#ff4d00',
  accent: '#f58900',
  income: '#16a34a',
  expense: '#dc2626',
  neutral: '#6b7280',
  grid: '#e5e7eb',
};

/** Categorical palette for series and slices, in order of use. */
export const SERIES = [
  '#0066eb',
  '#f58900',
  '#16a34a',
  '#9333ea',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
  '#db2777',
  '#4b5563',
  '#65a30d',
];

export const axisPeso = (value: number) => formatPeso(value, { compact: true });
export const tooltipPeso = (value: unknown) =>
  typeof value === 'number' ? formatPeso(value) : String(value ?? '—');

export const axisProps = {
  tick: { fontSize: 12, fill: '#4b5563' },
  tickLine: false,
  axisLine: { stroke: COLORS.grid },
};
