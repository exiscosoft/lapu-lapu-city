import { parseAsString, useQueryState } from 'nuqs';
import { Award, FileSignature, PiggyBank, Receipt } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsv } from '../../../lib/csv';
import {
  formatPercent,
  formatPeriod,
  formatPeso,
  isNumber,
} from '../../../lib/format';
import type { BidRow } from '../../../types/fdp';
import { AboutThisData } from '../AboutThisData';
import ChartCard, { EmptyState } from '../ChartCard';
import DataTable, { type Column } from '../DataTable';
import StatCard from '../StatCard';
import {
  axisPeso,
  axisProps,
  COLORS,
  SERIES,
  tooltipPeso,
} from '../chartTheme';
import { sum } from '../selectors';

const columns: Column<BidRow>[] = [
  {
    key: 'period',
    header: 'Period',
    value: r => `${r.year}-${r.quarter ?? 0}`,
    render: r => formatPeriod(r.year, r.quarter),
  },
  {
    key: 'description',
    header: 'Project',
    value: r => r.description,
    className: 'min-w-64',
  },
  { key: 'category', header: 'Type', value: r => r.category },
  { key: 'bidder', header: 'Winning bidder', value: r => r.bidder },
  {
    key: 'abc',
    header: 'Approved budget',
    value: r => r.abc,
    render: r => formatPeso(r.abc),
    align: 'right',
  },
  {
    key: 'bidAmount',
    header: 'Contract amount',
    value: r => r.bidAmount,
    render: r => formatPeso(r.bidAmount),
    align: 'right',
  },
  {
    key: 'source',
    header: 'Source',
    value: r => r.docId,
    sortable: false,
    render: r => (
      <a
        href={r.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 hover:underline"
      >
        PDF
      </a>
    ),
  },
];

const CATEGORIES = [
  'All',
  'Civil Works',
  'Goods and Services',
  'Consulting Services',
];

export default function ProcurementSection({
  rows,
  year,
}: {
  rows: BidRow[];
  year: number;
}) {
  const [category, setCategory] = useQueryState(
    'type',
    parseAsString.withDefault('All')
  );
  const yearRows = useMemo(
    () => rows.filter(r => r.year === year),
    [rows, year]
  );
  const filtered = useMemo(
    () =>
      category === 'All'
        ? yearRows
        : yearRows.filter(r => r.category === category),
    [yearRows, category]
  );

  if (!rows.length)
    return <EmptyState>Bid results are still being transcribed.</EmptyState>;

  const awarded = sum(filtered.map(r => r.bidAmount));
  const budget = sum(
    filtered.filter(r => isNumber(r.bidAmount)).map(r => r.abc)
  );
  const savings = budget - awarded;

  const topBidders = Object.entries(
    filtered.reduce<Record<string, { amount: number; count: number }>>(
      (acc, r) => {
        if (!r.bidder || !isNumber(r.bidAmount)) return acc;
        acc[r.bidder] ??= { amount: 0, count: 0 };
        acc[r.bidder].amount += r.bidAmount;
        acc[r.bidder].count += 1;
        return acc;
      },
      {}
    )
  )
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const byCategory = CATEGORIES.slice(1)
    .map((c, i) => ({
      name: c,
      value: sum(yearRows.filter(r => r.category === c).map(r => r.bidAmount)),
      color: SERIES[i],
    }))
    .filter(c => c.value > 0);

  const byYear = [...new Set(rows.map(r => r.year))].sort().map(y => {
    const subset = rows.filter(
      r => r.year === y && (category === 'All' || r.category === category)
    );
    return {
      year: String(y),
      awarded: sum(subset.map(r => r.bidAmount)),
      count: subset.length,
    };
  });

  const docs = [...new Map(yearRows.map(r => [r.docId, r])).values()].map(
    r => ({
      id: r.docId,
      title: `Bid results: ${r.category}`,
      year: r.year,
      quarter: r.quarter,
      sourceUrl: r.sourceUrl,
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">Procurement type:</span>
        {CATEGORIES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={
              category === c
                ? 'rounded-full bg-gray-900 px-3 py-1 text-sm text-white'
                : 'rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50'
            }
          >
            {c}
          </button>
        ))}
      </div>

      {!yearRows.length ? (
        <EmptyState>
          No bid results have been transcribed for {year}. Pick another year
          above.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Contracts awarded"
            value={filtered.length.toLocaleString()}
            subtext={`${year}, ${category === 'All' ? 'all types' : category}`}
            icon={FileSignature}
          />
          <StatCard
            label="Total contract amount"
            value={formatPeso(awarded, { compact: true })}
            subtext={formatPeso(awarded)}
            icon={Receipt}
            tone="expense"
          />
          <StatCard
            label="Approved budgets"
            value={formatPeso(budget, { compact: true })}
            subtext="Approved Budget for the Contract (ABC)"
            icon={Award}
            tone="neutral"
          />
          <StatCard
            label="Below approved budget"
            value={formatPeso(savings, { compact: true })}
            subtext={
              budget
                ? `${formatPercent((savings / budget) * 100)} under the ABC`
                : undefined
            }
            icon={PiggyBank}
            tone="income"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {topBidders.length > 0 && (
          <ChartCard
            title={`Top winning bidders, ${year}`}
            description="By total contract amount won."
            sources={docs}
          >
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart
                  data={topBidders}
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
                    width={150}
                    {...axisProps}
                    tickFormatter={(v: string) =>
                      v.length > 24 ? `${v.slice(0, 22)}…` : v
                    }
                  />
                  <Tooltip formatter={tooltipPeso} />
                  <Bar
                    dataKey="amount"
                    name="Contract amount"
                    fill={COLORS.primary}
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
        <div className="grid gap-6">
          {byCategory.length > 0 && (
            <ChartCard
              title={`Contract amounts by type, ${year}`}
              sources={docs}
            >
              <div className="h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="90%"
                    >
                      {byCategory.map(c => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={tooltipPeso} />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
          <ChartCard
            title="Contracts awarded by year"
            description="Total contract amount from the bid results transcribed so far."
          >
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={byYear} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="year" {...axisProps} />
                  <YAxis tickFormatter={axisPeso} width={64} {...axisProps} />
                  <Tooltip formatter={tooltipPeso} />
                  <Bar
                    dataKey="awarded"
                    name="Contract amount"
                    radius={[3, 3, 0, 0]}
                  >
                    {byYear.map(d => (
                      <Cell
                        key={d.year}
                        fill={
                          Number(d.year) === year
                            ? COLORS.primary
                            : COLORS.primaryLight
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>

      {yearRows.length > 0 && (
        <ChartCard
          title={`Contracts, ${year}`}
          description="Every awarded contract in the quarterly bid result reports. Search by project, bidder or reference number."
          sources={docs}
          onDownload={() =>
            downloadCsv(
              `lapu-lapu-bid-results-${year}`,
              [
                { header: 'Year', value: r => r.year },
                { header: 'Quarter', value: r => r.quarter },
                { header: 'Type', value: r => r.category },
                { header: 'Reference no.', value: r => r.refNo },
                { header: 'Project', value: r => r.description },
                { header: 'Location', value: r => r.location },
                { header: 'Approved budget (PHP)', value: r => r.abc },
                { header: 'Winning bidder', value: r => r.bidder },
                { header: 'Bidder address', value: r => r.bidderAddress },
                { header: 'Contract amount (PHP)', value: r => r.bidAmount },
                { header: 'Bidding date', value: r => r.biddingDate },
                { header: 'Duration', value: r => r.duration },
                { header: 'Source PDF', value: r => r.sourceUrl },
              ],
              filtered
            )
          }
        >
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r, i) => `${r.docId}-${i}`}
            searchPlaceholder="Search projects, bidders, reference no."
            initialSort={{ key: 'bidAmount', dir: 'desc' }}
          />
        </ChartCard>
      )}

      <AboutThisData>
        <p>
          Under the Full Disclosure Policy, the City posts quarterly bid results
          for civil works (FDP Form 10a), goods and services (10b) and
          consulting services (10c). The Approved Budget for the Contract (ABC)
          is the ceiling set before bidding; the contract amount is the winning
          bid.
        </p>
      </AboutThisData>
    </div>
  );
}
