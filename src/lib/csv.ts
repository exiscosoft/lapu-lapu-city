export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Downloads rows as a CSV file. Put the unit in the header
 * (e.g. "Amount (PHP)") so the numbers are unambiguous once exported.
 */
export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[]
) {
  const lines = [
    columns.map(c => escape(c.header)).join(','),
    ...rows.map(row => columns.map(c => escape(c.value(row))).join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
