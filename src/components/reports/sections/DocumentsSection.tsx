import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { formatPeriod } from '../../../lib/format';
import type { Catalog, CatalogDocument } from '../../../types/fdp';
import { AboutThisData } from '../AboutThisData';
import ChartCard from '../ChartCard';
import DataTable, { type Column } from '../DataTable';
import TranscriptModal from '../TranscriptModal';

export default function DocumentsSection({ catalog }: { catalog: Catalog }) {
  const [type, setType] = useQueryState('doc', parseAsString.withDefault(''));
  const [viewing, setViewing] = useState<CatalogDocument | null>(null);
  const docs = useMemo(
    () =>
      catalog.documents.filter(
        d => !d.duplicateOf && (!type || d.type === type)
      ),
    [catalog, type]
  );

  const columns: Column<CatalogDocument>[] = [
    {
      key: 'period',
      header: 'Period',
      value: d => d.year * 10 + (d.quarter ?? 5),
      render: d => formatPeriod(d.year, d.quarter),
    },
    {
      key: 'type',
      header: 'Report',
      value: d => catalog.types[d.type] || d.type,
    },
    {
      key: 'title',
      header: 'Title as posted',
      value: d => d.title,
      className: 'min-w-56',
      render: d => (
        <span>
          {d.title}
          {d.notes.some(n => /mismatch|printed|differs|actually/i.test(n)) && (
            <span
              className="ml-1 text-xs text-accent-700"
              title={d.notes.join('\n')}
            >
              (see notes)
            </span>
          )}
        </span>
      ),
    },
    { key: 'pages', header: 'Pages', value: d => d.pages, align: 'right' },
    {
      key: 'links',
      header: 'Open',
      value: d => (d.transcribed ? 1 : 0),
      render: d => (
        <span className="flex justify-end gap-3 whitespace-nowrap md:justify-start">
          {d.transcribed ? (
            <button
              type="button"
              onClick={() => setViewing(d)}
              className="text-primary-600 hover:underline"
            >
              Transcription
            </button>
          ) : (
            <span className="text-gray-400">Not transcribed</span>
          )}
          <a
            href={d.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            PDF
          </a>
        </span>
      ),
    },
  ];

  const typeOptions = Object.entries(catalog.types).filter(([key]) =>
    catalog.documents.some(d => d.type === key)
  );

  return (
    <div className="space-y-6">
      <ChartCard
        title="Full Disclosure Policy documents"
        description="Every report posted on the City’s Full Disclosure Policy page. Periods are as printed on each form, which sometimes differs from how the website labels the file."
      >
        <DataTable
          columns={columns}
          rows={docs}
          rowKey={d => d.id}
          initialSort={{ key: 'period', dir: 'desc' }}
          searchPlaceholder="Search documents"
          toolbar={
            <label className="text-sm">
              <span className="sr-only">Report type</span>
              <select
                value={type}
                onChange={e => setType(e.target.value || null)}
                className="rounded-md border border-gray-300 py-1.5 pl-2 pr-8 text-sm"
              >
                <option value="">All report types</option>
                {typeOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          }
        />
      </ChartCard>
      <AboutThisData>
        <p>
          The Full Disclosure Policy of the Department of the Interior and Local
          Government requires local governments to post their budgets, finances,
          procurement and fund use in conspicuous places and online. The
          originals are scanned PDFs at{' '}
          <a
            href="https://lapulapucitygov.ph/fdp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            lapulapucitygov.ph/fdp
          </a>
          . Transcriptions are provided so the figures can be searched, compared
          and downloaded.
        </p>
      </AboutThisData>
      <TranscriptModal document={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
