import { HandCoins, Landmark, Percent } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsv } from '../../../lib/csv';
import { formatPercent, formatPeriod, formatPeso } from '../../../lib/format';
import type { DebtEntry } from '../../../types/fdp';
import { AboutThisData } from '../AboutThisData';
import ChartCard, { EmptyState } from '../ChartCard';
import DataTable from '../DataTable';
import StatCard from '../StatCard';
import { axisPeso, axisProps, COLORS, tooltipPeso } from '../chartTheme';
import { latestForYear, sourcesOf } from '../selectors';

export default function DebtSection({
  entries,
  year,
}: {
  entries: DebtEntry[];
  year: number;
}) {
  if (!entries.length)
    return (
      <EmptyState>
        Statements of Indebtedness are still being transcribed.
      </EmptyState>
    );

  const selected = latestForYear(entries, year);
  const trend = entries.map(e => ({
    label: formatPeriod(e.year, e.quarter),
    outstanding: e.totalOutstanding,
  }));

  return (
    <div className="space-y-6">
      {selected ? (
        <>
          <p className="text-sm text-gray-600">
            Showing{' '}
            <strong>{formatPeriod(selected.year, selected.quarter)}</strong>.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Outstanding balance"
              value={formatPeso(selected.totalOutstanding, { compact: true })}
              subtext={formatPeso(selected.totalOutstanding)}
              icon={Landmark}
              tone="expense"
            />
            <StatCard
              label="Loans"
              value={String(selected.loans.length)}
              subtext={selected.loans
                .map(l => l.lender)
                .filter(Boolean)
                .join(', ')}
              icon={HandCoins}
              tone="neutral"
            />
            <StatCard
              label="Original principal"
              value={formatPeso(
                selected.loans.reduce((a, l) => a + (l.principal ?? 0), 0),
                { compact: true }
              )}
              subtext={
                selected.loans.some(l => l.interestRate)
                  ? `Interest: ${selected.loans.map(l => formatPercent(l.interestRate, 2)).join(', ')}`
                  : 'Interest-free'
              }
              icon={Percent}
            />
          </div>
        </>
      ) : (
        <EmptyState>
          No Statement of Indebtedness has been transcribed for {year}.
        </EmptyState>
      )}

      <ChartCard
        title="Outstanding debt over time"
        description="Total unpaid principal at the end of each reported period."
        sources={sourcesOf(entries)}
      >
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend} margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis tickFormatter={axisPeso} width={64} {...axisProps} />
              <Tooltip formatter={tooltipPeso} />
              <Line
                dataKey="outstanding"
                name="Outstanding balance"
                stroke={COLORS.expense}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {selected && selected.loans.length > 0 && (
        <ChartCard
          title="Loans"
          sources={sourcesOf([selected])}
          onDownload={() =>
            downloadCsv(
              `lapu-lapu-${selected.id}-loans`,
              [
                { header: 'Lender', value: r => r.lender },
                { header: 'Purpose', value: r => r.purpose },
                { header: 'Principal (PHP)', value: r => r.principal },
                { header: 'Interest rate (%)', value: r => r.interestRate },
                { header: 'Date contracted', value: r => r.dateContracted },
                { header: 'Term', value: r => r.term },
                { header: 'Principal paid (PHP)', value: r => r.paidPrincipal },
                { header: 'Interest paid (PHP)', value: r => r.paidInterest },
                { header: 'Outstanding (PHP)', value: r => r.outstanding },
              ],
              selected.loans
            )
          }
        >
          <DataTable
            searchable={false}
            columns={[
              { key: 'lender', header: 'Lender', value: r => r.lender },
              {
                key: 'purpose',
                header: 'Purpose',
                value: r => r.purpose,
                className: 'min-w-48',
              },
              {
                key: 'principal',
                header: 'Principal',
                value: r => r.principal,
                render: r => formatPeso(r.principal),
                align: 'right',
              },
              {
                key: 'paidPrincipal',
                header: 'Principal paid',
                value: r => r.paidPrincipal,
                render: r => formatPeso(r.paidPrincipal),
                align: 'right',
              },
              {
                key: 'outstanding',
                header: 'Outstanding',
                value: r => r.outstanding,
                render: r => formatPeso(r.outstanding),
                align: 'right',
              },
            ]}
            rows={selected.loans}
            rowKey={(r, i) => `${i}-${r.lender}`}
          />
        </ChartCard>
      )}

      <AboutThisData>
        <p>
          The Statement of Indebtedness, Payments and Balances lists every loan
          the City owes, what has been paid and what remains. Local governments
          may spend at most 20% of their regular income on debt service.
        </p>
      </AboutThisData>
    </div>
  );
}
