/**
 * Table component with view toggle functionality
 */

import {
  type ReactNode,
  type HTMLAttributes,
  type ReactElement,
  Children,
  isValidElement,
  useState,
  useMemo,
} from 'react';
import { Table, List } from 'lucide-react';
import { type TypographyTheme } from './typographyThemes';

type ElementProps = {
  children?: ReactNode;
  node?: { tagName?: string };
};

// react-markdown passes the source hast node to custom components, which
// identifies the element regardless of how it is styled or keyed
const tagNameOf = (element: ReactElement<ElementProps>): string | undefined =>
  element.props.node?.tagName ??
  (typeof element.type === 'string' ? element.type : undefined);

const textOf = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<ElementProps>(node)) return textOf(node.props.children);
  return '';
};

// Collect each row's cells (keeping their rich content) and note which rows
// come from the table head
const extractRows = (
  children: ReactNode
): Array<{ cells: ReactNode[]; isHeader: boolean }> => {
  const rows: Array<{ cells: ReactNode[]; isHeader: boolean }> = [];

  const walk = (node: ReactNode, inHead: boolean): void => {
    Children.forEach(node, child => {
      if (!isValidElement<ElementProps>(child)) return;
      const tag = tagNameOf(child);

      if (tag === 'tr') {
        const cells: ReactNode[] = [];
        Children.forEach(child.props.children, cell => {
          if (!isValidElement<ElementProps>(cell)) return;
          const cellTag = tagNameOf(cell);
          if (cellTag === 'td' || cellTag === 'th') {
            cells.push(cell.props.children);
          }
        });
        rows.push({ cells, isHeader: inHead });
      } else {
        walk(child.props.children, inHead || tag === 'thead');
      }
    });
  };

  walk(children, false);
  return rows;
};

// Custom Table Component with view toggle
export const TableWithToggle = ({
  children,
  theme,
  ...props
}: {
  children: ReactNode;
  theme: TypographyTheme;
} & HTMLAttributes<HTMLTableElement>) => {
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list');

  // Extract table data for list view
  const tableData = useMemo(() => {
    const rows = extractRows(children);
    const headers = rows.find(row => row.isHeader)?.cells ?? [];
    const bodyRows = rows
      .filter(row => !row.isHeader)
      .map(row => row.cells)
      .filter(cells => cells.some(cell => textOf(cell).trim()));
    const isNamed = headers.map(header => Boolean(textOf(header).trim()));
    const hasHeaders = isNamed.some(Boolean);

    return { headers, rows: bodyRows, hasHeaders, isNamed };
  }, [children]);

  const showTable = viewMode === 'table' || tableData.rows.length === 0;

  return (
    <div className="-mx-4 sm:mx-0 mb-6">
      {/* View Toggle Buttons */}
      <div className="flex justify-end mb-4 gap-2 px-4 sm:px-0">
        <button
          onClick={() => setViewMode('table')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            viewMode === 'table'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Table size={16} />
          Table
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <List size={16} />
          List
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table
            className={`${theme.components.table} sticky-table`}
            style={
              {
                '--first-col-width': '12rem',
              } as React.CSSProperties
            }
            {...props}
          >
            {children}
          </table>
        </div>
      ) : tableData.hasHeaders ? (
        <div className="space-y-4 px-4 sm:px-0">
          {tableData.rows.map((cells, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mx-2 sm:mx-0"
            >
              <div className="grid gap-3">
                {/* Cells under blank headers (e.g. a row number or item
                    name) have no label, so they become the card's title */}
                {cells.some(
                  (cell, cellIndex) =>
                    !tableData.isNamed[cellIndex] && textOf(cell).trim()
                ) && (
                  <div className="font-semibold text-gray-900 text-sm">
                    {cells.map(
                      (cell, cellIndex) =>
                        !tableData.isNamed[cellIndex] && (
                          <span key={cellIndex} className="mr-1">
                            {cell}
                          </span>
                        )
                    )}
                  </div>
                )}
                {tableData.headers.map((header, headerIndex) =>
                  !tableData.isNamed[headerIndex] ? null : (
                    <div
                      key={headerIndex}
                      className="flex flex-col sm:flex-row sm:items-center"
                    >
                      <div className="font-semibold text-gray-800 text-sm mb-1 sm:mb-0 sm:w-1/3 sm:pr-4">
                        {header}:
                      </div>
                      <div className="text-gray-700 text-sm sm:w-2/3">
                        {cells[headerIndex]}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Header-less tables are label/value lists: the first cell of each
        // row is the label and the remaining cells are its value
        <div className="px-4 sm:px-0">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mx-2 sm:mx-0">
            <div className="grid gap-3">
              {tableData.rows.map(([label, ...values], index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center"
                >
                  <div className="font-semibold text-gray-800 text-sm mb-1 sm:mb-0 sm:w-1/3 sm:pr-4">
                    {label}
                  </div>
                  <div className="text-gray-700 text-sm sm:w-2/3">
                    {values.map((value, valueIndex) => (
                      <div key={valueIndex}>{value}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
