import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  /** Cell content; defaults to the raw value. */
  render?: (row: T) => ReactNode;
  /** Value used for sorting and searching. */
  value: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right';
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  toolbar?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
}

/**
 * Searchable, sortable, paginated table. Below the md breakpoint each row
 * becomes a card of label/value pairs so nothing scrolls sideways.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchable = true,
  searchPlaceholder = 'Search…',
  pageSize = 25,
  initialSort,
  toolbar,
  rowClassName,
  emptyMessage = 'No records match.',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q
      ? rows.filter(row =>
          columns.some(c =>
            String(c.value(row) ?? '')
              .toLowerCase()
              .includes(q)
          )
        )
      : rows;
    if (sort) {
      const col = columns.find(c => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) => {
          const va = col.value(a);
          const vb = col.value(b);
          if (va === vb) return 0;
          if (va === null || va === undefined || va === '') return 1;
          if (vb === null || vb === undefined || vb === '') return -1;
          const cmp =
            typeof va === 'number' && typeof vb === 'number'
              ? va - vb
              : String(va).localeCompare(String(vb), 'en', { numeric: true });
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, columns, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * pageSize, (current + 1) * pageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort(s =>
      s?.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' }
    );
  };

  const cell = (c: Column<T>, row: T) => c.render?.(row) ?? c.value(row) ?? '—';

  return (
    <div>
      {(searchable || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {searchable && (
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <span className="sr-only">Search</span>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </label>
          )}
          {toolbar}
          <span className="ml-auto text-xs text-gray-500">
            {filtered.length.toLocaleString()} of {rows.length.toLocaleString()}{' '}
            records
          </span>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-md border border-gray-200 md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              {columns.map(c => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2 font-semibold',
                    c.align === 'right' && 'text-right'
                  )}
                  aria-sort={
                    sort?.key === c.key
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  {c.sortable === false ? (
                    c.header
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        'inline-flex items-center gap-1 uppercase hover:text-gray-900',
                        c.align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown
                          className="h-3 w-3 opacity-40"
                          aria-hidden
                        />
                      )}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((row, i) => (
              <tr
                key={rowKey(row, current * pageSize + i)}
                className={cn('hover:bg-gray-50', rowClassName?.(row))}
              >
                {columns.map(c => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 py-2 align-top text-gray-800',
                      c.align === 'right' && 'text-right tabular-nums',
                      c.className
                    )}
                  >
                    {cell(c, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-6 text-center text-sm text-gray-500">
            {emptyMessage}
          </p>
        )}
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {visible.map((row, i) => (
          <li
            key={rowKey(row, current * pageSize + i)}
            className={cn(
              'rounded-md border border-gray-200 p-3',
              rowClassName?.(row)
            )}
          >
            <dl className="space-y-1.5 text-sm">
              {columns.map(c => (
                <div key={c.key} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-gray-500">{c.header}</dt>
                  <dd
                    className={cn(
                      'min-w-0 text-right text-gray-900',
                      c.align === 'right' && 'tabular-nums'
                    )}
                  >
                    {cell(c, row)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
        {!visible.length && (
          <li className="p-6 text-center text-sm text-gray-500">
            {emptyMessage}
          </li>
        )}
      </ul>

      {pageCount > 1 && (
        <nav
          className="mt-3 flex items-center justify-between text-sm"
          aria-label="Pagination"
        >
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {current + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount - 1}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
