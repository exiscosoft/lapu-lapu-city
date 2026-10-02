import { Building2, Coins, HardHat, Users } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsv } from '../../../lib/csv';
import { formatPercent, formatPeso } from '../../../lib/format';
import type {
  BudgetEntry,
  BudgetOffice,
  Catalog,
  CatalogDocument,
} from '../../../types/fdp';
import { AboutThisData } from '../AboutThisData';
import ChartCard, { EmptyState } from '../ChartCard';
import DataTable from '../DataTable';
import StatCard from '../StatCard';
import TranscriptModal from '../TranscriptModal';
import {
  axisPeso,
  axisProps,
  COLORS,
  SERIES,
  tooltipPeso,
} from '../chartTheme';
import { sourcesOf, sum } from '../selectors';

type OfficeRow = BudgetOffice & { docId: string };

/**
 * Chart label: the most specific part of a long budget name, e.g.
 * "OFFICE OF THE CITY SOCIAL WELFARE ... - SPECIAL PURPOSE APPROPRIATION -
 * Senior Citizens" → "Senior Citizens (SPA)". Tables keep the full name.
 */
function shortOfficeName(name: string) {
  const parts = name.split(/\s+-\s*/).filter(Boolean);
  const isSpa = parts.some(p => /special purpose appropriation/i.test(p));
  const specific = parts.filter(
    p => !/special purpose appropriation|sector$/i.test(p.trim())
  );
  const base =
    specific.length > 1 ? specific[specific.length - 1] : specific[0] || name;
  const short = isSpa ? `${base} (SPA)` : base;
  return short.length > 40 ? `${short.slice(0, 38)}…` : short;
}

export default function BudgetSection({
  entries,
  catalog,
  year,
}: {
  entries: BudgetEntry[];
  catalog: Catalog;
  year: number;
}) {
  const [viewing, setViewing] = useState<CatalogDocument | null>(null);
  const docs = entries.filter(
    e => e.year === year && e.type === 'annual-budget'
  );
  // An office that spans two posted parts (e.g. the 2025 Development
  // Project, or the City College) is summarised partly in each: merge the
  // parts field by field so it is counted once and in full.
  const offices: OfficeRow[] = [
    ...docs
      .flatMap(d => d.offices.map(o => ({ ...o, docId: d.id })))
      .reduce((byKey, o) => {
        const prev = byKey.get(o.key);
        byKey.set(
          o.key,
          prev
            ? {
                ...prev,
                ps: prev.ps ?? o.ps,
                mooe: prev.mooe ?? o.mooe,
                capitalOutlay: prev.capitalOutlay ?? o.capitalOutlay,
                total: prev.total ?? o.total,
              }
            : o
        );
        return byKey;
      }, new Map<string, OfficeRow>())
      .values(),
  ];
  const total = sum(offices.map(o => o.total));
  const ps = sum(offices.map(o => o.ps));
  const mooe = sum(offices.map(o => o.mooe));
  const co = sum(offices.map(o => o.capitalOutlay));
  const top = [...offices]
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, 15)
    .map(o => ({
      name: shortOfficeName(o.office),
      ps: o.ps ?? 0,
      mooe: o.mooe ?? 0,
      capitalOutlay: o.capitalOutlay ?? 0,
    }));
  const tree = offices
    .filter(o => (o.total ?? 0) > 0)
    .map((o, i) => ({
      name: shortOfficeName(o.office),
      size: o.total ?? 0,
      fill: SERIES[i % SERIES.length],
    }));
  const catalogDocs = catalog.documents.filter(
    d =>
      d.year === year && (d.type === 'annual-budget' || d.type === 'sef-budget')
  );

  return (
    <div className="space-y-6">
      {!offices.length ? (
        <EmptyState>
          No annual budget figures have been transcribed for documents published
          in {year}. Budget documents exist for 2023, 2025 and 2026; the full
          list is in the Source Documents tab.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Totals of the budget-year column for the offices covered by the{' '}
            {docs.length} budget document{docs.length > 1 ? 's' : ''} published
            in {year}. These are excerpts, so not every office may appear.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total (offices shown)"
              value={formatPeso(total, { compact: true })}
              subtext={`${offices.length} offices`}
              icon={Building2}
            />
            <StatCard
              label="Personnel services"
              value={formatPeso(ps, { compact: true })}
              subtext={
                total
                  ? `${formatPercent((ps / total) * 100)} of total`
                  : undefined
              }
              icon={Users}
              tone="neutral"
            />
            <StatCard
              label="Maintenance and operating"
              value={formatPeso(mooe, { compact: true })}
              subtext={
                total
                  ? `${formatPercent((mooe / total) * 100)} of total`
                  : undefined
              }
              icon={Coins}
              tone="accent"
            />
            <StatCard
              label="Capital outlay"
              value={formatPeso(co, { compact: true })}
              subtext={
                total
                  ? `${formatPercent((co / total) * 100)} of total`
                  : undefined
              }
              icon={HardHat}
              tone="income"
            />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Largest office budgets"
              description="Split into personnel, maintenance and other operating expenses (MOOE), and capital outlay. SPA = special purpose appropriation."
              sources={sourcesOf(docs)}
            >
              <div className="h-[28rem]">
                <ResponsiveContainer>
                  <BarChart
                    data={top}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={axisPeso}
                      {...axisProps}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={180}
                      {...axisProps}
                    />
                    <Tooltip formatter={tooltipPeso} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="ps"
                      name="Personnel"
                      stackId="b"
                      fill={SERIES[0]}
                    />
                    <Bar
                      dataKey="mooe"
                      name="MOOE"
                      stackId="b"
                      fill={SERIES[1]}
                    />
                    <Bar
                      dataKey="capitalOutlay"
                      name="Capital outlay"
                      stackId="b"
                      fill={SERIES[2]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard
              title="Share of the budget by office"
              description="Each box is sized by the office’s total budget."
              sources={sourcesOf(docs)}
            >
              <div className="h-[28rem]">
                <ResponsiveContainer>
                  <Treemap
                    data={tree}
                    dataKey="size"
                    nameKey="name"
                    stroke="#fff"
                    isAnimationActive={false}
                  >
                    <Tooltip formatter={tooltipPeso} />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
          <ChartCard
            title="Budget by office"
            sources={sourcesOf(docs)}
            onDownload={() =>
              downloadCsv(
                `lapu-lapu-budget-${year}`,
                [
                  { header: 'Office', value: r => r.office },
                  { header: 'Personnel services (PHP)', value: r => r.ps },
                  { header: 'MOOE (PHP)', value: r => r.mooe },
                  {
                    header: 'Capital outlay (PHP)',
                    value: r => r.capitalOutlay,
                  },
                  { header: 'Total (PHP)', value: r => r.total },
                  { header: 'Document', value: r => r.docId },
                ],
                offices
              )
            }
          >
            <DataTable
              columns={[
                {
                  key: 'office',
                  header: 'Office',
                  value: r => r.office,
                  className: 'min-w-56',
                },
                {
                  key: 'ps',
                  header: 'Personnel',
                  value: r => r.ps,
                  render: r => formatPeso(r.ps),
                  align: 'right',
                },
                {
                  key: 'mooe',
                  header: 'MOOE',
                  value: r => r.mooe,
                  render: r => formatPeso(r.mooe),
                  align: 'right',
                },
                {
                  key: 'capitalOutlay',
                  header: 'Capital outlay',
                  value: r => r.capitalOutlay,
                  render: r => formatPeso(r.capitalOutlay),
                  align: 'right',
                },
                {
                  key: 'total',
                  header: 'Total',
                  value: r => r.total,
                  render: r => formatPeso(r.total),
                  align: 'right',
                },
              ]}
              rows={offices}
              rowKey={(r, i) => `${r.docId}-${r.key}-${i}`}
              searchPlaceholder="Search offices"
              initialSort={{ key: 'total', dir: 'desc' }}
            />
          </ChartCard>
        </>
      )}

      {catalogDocs.length > 0 && (
        <ChartCard
          title={`Budget documents published in ${year}`}
          description="Open a transcription to see every object of expenditure, or the official PDF."
        >
          <ul className="divide-y divide-gray-100 text-sm">
            {catalogDocs.map(d => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="text-gray-800">
                  {d.title}{' '}
                  <span className="text-gray-500">({d.pages} pages)</span>
                </span>
                <span className="flex gap-3">
                  {d.transcribed && (
                    <button
                      type="button"
                      onClick={() => setViewing(d)}
                      className="text-primary-600 hover:underline"
                    >
                      View transcription
                    </button>
                  )}
                  <a
                    href={d.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    Official PDF
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}

      <AboutThisData>
        <p>
          The annual budget is prepared on Local Budget Preparation (LBP) forms.
          Each office lists its objects of expenditure for the past year, the
          current year and the budget year, grouped into personnel services,
          maintenance and other operating expenses (MOOE), and capital outlay.
          The City posted excerpts of these forms, so totals here cover only the
          offices included in the posted pages.
        </p>
      </AboutThisData>
      <TranscriptModal document={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
