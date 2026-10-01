import { formatNumber, formatPeso, isNumber } from '../../lib/format';
import { cn } from '../../lib/utils';
import type { CellValue, FdpColumn, FdpTable } from '../../types/fdp';

function formatCell(value: CellValue | undefined, type: FdpColumn['type']) {
  if (value === null || value === undefined || value === '') return '';
  if (isNumber(value)) {
    if (type === 'amount') return formatPeso(value).replace('₱', '');
    if (type === 'percent') return `${value}%`;
    return formatNumber(value);
  }
  return String(value);
}

/**
 * Renders a transcribed table as printed: indented line items, bold
 * subtotals and totals. Wide statements scroll horizontally inside the card.
 */
export default function StatementTable({
  table,
  hideColumns = [],
}: {
  table: FdpTable;
  hideColumns?: string[];
}) {
  const columns = table.columns.filter(c => !hideColumns.includes(c.key));
  const labelIsColumn = columns.some(c =>
    ['program', 'description', 'object', 'particulars', 'item'].includes(c.key)
  );

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-gray-50 text-xs text-gray-600">
          <tr>
            {!labelIsColumn && (
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Particulars
              </th>
            )}
            {columns.map(c => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'px-3 py-2 font-semibold',
                  c.type === 'amount' || c.type === 'number'
                    ? 'text-right'
                    : 'text-left'
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {table.rows.map((row, i) => {
            const strong = row.kind === 'total' || row.kind === 'subtotal';
            return (
              <tr
                key={i}
                className={cn(
                  row.kind === 'total' && 'bg-gray-50',
                  row.kind === 'header' && 'bg-gray-50/60'
                )}
              >
                {!labelIsColumn && (
                  <th
                    scope="row"
                    className={cn(
                      'px-3 py-1.5 text-left align-top',
                      strong || row.kind === 'header'
                        ? 'font-semibold text-gray-900'
                        : 'font-normal text-gray-700'
                    )}
                    style={{ paddingLeft: `${0.75 + (row.level || 0) * 1}rem` }}
                  >
                    {row.label}
                  </th>
                )}
                {columns.map(c => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 py-1.5 align-top',
                      c.type === 'amount' || c.type === 'number'
                        ? 'whitespace-nowrap text-right tabular-nums'
                        : 'min-w-40',
                      strong ? 'font-semibold text-gray-900' : 'text-gray-700'
                    )}
                  >
                    {formatCell(row.values?.[c.key], c.type)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
