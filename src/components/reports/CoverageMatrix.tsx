import { Fragment } from 'react';
import { cn } from '../../lib/utils';
import type { Catalog } from '../../types/fdp';

const SLOTS = [1, 2, 3, 4, null] as const;

/**
 * Report type × year grid showing which FDP documents the City has published.
 * Each year cell has a box per quarter plus one for annual documents.
 */
export default function CoverageMatrix({ catalog }: { catalog: Catalog }) {
  const docs = catalog.documents.filter(d => !d.duplicateOf);
  const years = [...new Set(docs.map(d => d.year))].sort((a, b) => a - b);
  const types = Object.keys(catalog.types).filter(t =>
    docs.some(d => d.type === t)
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th scope="col" className="text-left font-medium text-gray-500">
                Report
              </th>
              {years.map(y => (
                <th key={y} scope="col" className="font-medium text-gray-600">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map(type => (
              <tr key={type}>
                <th
                  scope="row"
                  className="max-w-48 truncate pr-2 text-left font-normal text-gray-700"
                  title={catalog.types[type]}
                >
                  {catalog.types[type]}
                </th>
                {years.map(year => (
                  <td key={year}>
                    <div className="flex justify-center gap-0.5">
                      {SLOTS.map(q => {
                        const found = docs.filter(
                          d =>
                            d.type === type &&
                            d.year === year &&
                            d.quarter === q
                        );
                        const label = q ? `Q${q}` : 'Annual';
                        return (
                          <Fragment key={label}>
                            <span
                              title={
                                found.length
                                  ? `${catalog.types[type]}, ${label} ${year}: ${found.length} document(s)${found.some(d => !d.transcribed) ? ', not yet transcribed' : ''}`
                                  : `${catalog.types[type]}, ${label} ${year}: not published`
                              }
                              className={cn(
                                'h-3.5 w-3.5 rounded-[3px]',
                                q === null && 'rounded-full',
                                !found.length && 'bg-gray-100',
                                found.length &&
                                  found.every(d => d.transcribed) &&
                                  'bg-primary-600',
                                found.length &&
                                  found.some(d => !d.transcribed) &&
                                  'bg-primary-200'
                              )}
                            />
                          </Fragment>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-primary-600" /> Published
          and transcribed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-primary-200" /> Published,
          PDF only
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-gray-100 ring-1 ring-gray-200" />{' '}
          Not published
        </span>
        <span>Squares: Q1–Q4 · circle: annual document</span>
      </div>
    </div>
  );
}
