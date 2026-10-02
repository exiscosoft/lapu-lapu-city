import { Banknote, Landmark, Percent, Scale } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFdpJson } from '../../../hooks/useFdpData';
import { downloadCsv } from '../../../lib/csv';
import {
  formatPercent,
  formatPeriod,
  formatPeso,
  isNumber,
} from '../../../lib/format';
import type { FdpDocument, SreEntry } from '../../../types/fdp';
import ChartCard, { EmptyState } from '../ChartCard';
import { AboutThisData } from '../AboutThisData';
import StatCard from '../StatCard';
import StatementTable from '../StatementTable';
import {
  axisPeso,
  axisProps,
  COLORS,
  SERIES,
  tooltipPeso,
} from '../chartTheme';
import {
  latestForYear,
  latestPerYear,
  partialLabel,
  sourcesOf,
  sreTotal,
} from '../selectors';

const REVENUE_PARTS = [
  { key: 'realPropertyTax', label: 'Real property tax' },
  { key: 'taxOnBusiness', label: 'Business tax' },
  { key: 'otherTaxes', label: 'Other taxes' },
  { key: 'nonTaxRevenue', label: 'Fees, charges and other' },
  { key: 'nta', label: 'National Tax Allotment' },
  { key: 'otherShares', label: 'Other national shares' },
  { key: 'grants', label: 'Grants and aid' },
];

const SECTORS = [
  { key: 'generalPublicServices', label: 'General public services' },
  { key: 'education', label: 'Education, culture and sports' },
  { key: 'health', label: 'Health, nutrition and population' },
  { key: 'labor', label: 'Labor and employment' },
  { key: 'housing', label: 'Housing and community development' },
  { key: 'socialWelfare', label: 'Social services and welfare' },
  { key: 'economicServices', label: 'Economic services' },
  { key: 'debtServiceInterest', label: 'Debt service (interest)' },
];

/** True when the statement prints the allotment as zero despite a target (2018). */
function omitsNta(e: SreEntry) {
  const nta = e.lines.nta;
  return sreTotal(e, 'nta') === 0 && isNumber(nta?.target) && nta.target > 0;
}

function yearLabel(e: SreEntry) {
  const partial = e.quarter && e.quarter < 4 ? '*' : '';
  return `${e.year}${partial}${omitsNta(e) ? '†' : ''}`;
}

export default function FinancesSection({
  entries,
  year,
}: {
  entries: SreEntry[];
  year: number;
}) {
  const perYear = useMemo(
    () => [...latestPerYear(entries).values()].sort((a, b) => a.year - b.year),
    [entries]
  );
  const selected = latestForYear(entries, year);
  const { data: statement } = useFdpJson<FdpDocument>(
    selected ? `docs/${selected.id}.json` : null
  );

  if (!entries.length)
    return (
      <EmptyState>
        Statements of Receipts and Expenditures are still being transcribed.
      </EmptyState>
    );

  const trend = perYear.map(e => {
    const income = sreTotal(e, 'totalCurrentOperatingIncome');
    const nta = sreTotal(e, 'nta');
    return {
      label: yearLabel(e),
      year: e.year,
      period: formatPeriod(e.year, e.quarter),
      income,
      expenditure: sreTotal(e, 'totalCurrentOperatingExpenditures'),
      capital: sreTotal(e, 'totalNonOperatingExpenditures'),
      ntaShare:
        !omitsNta(e) && isNumber(income) && isNumber(nta) && income
          ? (nta / income) * 100
          : null,
      ...Object.fromEntries(
        REVENUE_PARTS.map(p => [p.key, sreTotal(e, p.key)])
      ),
    };
  });

  const income = sreTotal(selected, 'totalCurrentOperatingIncome');
  const expenditure = sreTotal(selected, 'totalCurrentOperatingExpenditures');
  const net = sreTotal(selected, 'netOperatingIncome');
  const nta = sreTotal(selected, 'nta');
  const target = selected?.lines.totalCurrentOperatingIncome?.target;
  const partial = partialLabel(selected);
  const periodText = selected
    ? `${formatPeriod(selected.year, selected.quarter)}${partial ? `, ${partial}` : ''}`
    : '';

  const sectors = SECTORS.map((s, i) => ({
    name: s.label,
    value: sreTotal(selected, s.key) ?? 0,
    color: SERIES[i % SERIES.length],
  })).filter(s => s.value > 0);

  const collections = [
    ...REVENUE_PARTS.filter(p => p.key !== 'nonTaxRevenue'),
    { key: 'regulatoryFees', label: 'Regulatory fees' },
    { key: 'serviceCharges', label: 'Service charges' },
    { key: 'economicEnterprises', label: 'Economic enterprises' },
  ]
    .map(p => ({
      name: p.label,
      target: selected?.lines[p.key]?.target ?? null,
      actual: sreTotal(selected, p.key),
    }))
    .filter(r => isNumber(r.target) && r.target > 0);

  const quarters = entries
    .filter(e => e.year === year && e.quarter)
    .map(e => ({
      label: `Q${e.quarter}`,
      income: sreTotal(e, 'totalCurrentOperatingIncome'),
      expenditure: sreTotal(e, 'totalCurrentOperatingExpenditures'),
    }));

  const sourcesAll = sourcesOf(perYear);
  const sourcesSelected = selected ? sourcesOf([selected]) : [];

  return (
    <div className="space-y-6">
      {!selected ? (
        <EmptyState>
          No Statement of Receipts and Expenditures has been published for{' '}
          {year}. Pick another year above.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Showing <strong>{periodText}</strong>, from the latest Statement of
            Receipts and Expenditures for {year}.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Current operating income"
              value={formatPeso(income, { compact: true })}
              subtext={
                isNumber(target) && isNumber(income) && target
                  ? `${formatPercent((income / target) * 100)} of the ${formatPeso(target, { compact: true })} annual target`
                  : formatPeso(income)
              }
              icon={Banknote}
              tone="income"
              title={formatPeso(income)}
            />
            <StatCard
              label="Current operating expenditures"
              value={formatPeso(expenditure, { compact: true })}
              subtext="Personnel, operations and interest"
              icon={Landmark}
              tone="expense"
              title={formatPeso(expenditure)}
            />
            <StatCard
              label="Net operating income"
              value={formatPeso(net, { compact: true })}
              subtext={
                isNumber(net) && net >= 0
                  ? 'Income exceeded operating spending'
                  : 'Operating spending exceeded income'
              }
              icon={Scale}
              tone={isNumber(net) && net < 0 ? 'accent' : 'primary'}
              title={formatPeso(net)}
            />
            <StatCard
              label="Reliance on national allotment"
              value={
                isNumber(nta) && nta > 0 && isNumber(income) && income
                  ? formatPercent((nta / income) * 100)
                  : '—'
              }
              subtext="National Tax Allotment as a share of income"
              icon={Percent}
              tone="neutral"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Income and spending by year"
          description="Current operating income vs. operating and capital spending. * = year-to-date (no Q4 report yet). † = the statement leaves out the national allotment."
          sources={sourcesAll}
          onDownload={() =>
            downloadCsv(
              'lapu-lapu-income-expenditures-by-year',
              [
                { header: 'Period', value: r => r.period },
                {
                  header: 'Current operating income (PHP)',
                  value: r => r.income,
                },
                {
                  header: 'Current operating expenditures (PHP)',
                  value: r => r.expenditure,
                },
                {
                  header: 'Non-operating expenditures (PHP)',
                  value: r => r.capital,
                },
              ],
              trend
            )
          }
        >
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis tickFormatter={axisPeso} width={64} {...axisProps} />
                <Tooltip
                  formatter={tooltipPeso}
                  labelFormatter={(_, p) => p?.[0]?.payload.period}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="income"
                  name="Operating income"
                  fill={COLORS.income}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="expenditure"
                  name="Operating expenditures"
                  fill={COLORS.expense}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="capital"
                  name="Capital and debt"
                  fill={COLORS.accent}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Where the money comes from"
          description="Income by source each year. Local taxes vs. transfers from the national government."
          sources={sourcesAll}
          onDownload={() =>
            downloadCsv(
              'lapu-lapu-income-sources-by-year',
              [
                { header: 'Period', value: r => r.period },
                ...REVENUE_PARTS.map(p => ({
                  header: `${p.label} (PHP)`,
                  value: (r: (typeof trend)[number]) =>
                    r[p.key as keyof typeof r] as number | null,
                })),
              ],
              trend
            )
          }
        >
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis tickFormatter={axisPeso} width={64} {...axisProps} />
                <Tooltip
                  formatter={tooltipPeso}
                  labelFormatter={(_, p) => p?.[0]?.payload.period}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {REVENUE_PARTS.map((p, i) => (
                  <Bar
                    key={p.key}
                    dataKey={p.key}
                    name={p.label}
                    stackId="rev"
                    fill={SERIES[i]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {selected && (
          <ChartCard
            title={`Spending by sector, ${periodText}`}
            description="Current operating expenditures by sector, all funds."
            sources={sourcesSelected}
          >
            {sectors.length ? (
              <div className="grid items-center gap-4 sm:grid-cols-2">
                <div className="h-60">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={sectors}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="90%"
                        paddingAngle={1}
                      >
                        {sectors.map(s => (
                          <Cell key={s.name} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={tooltipPeso} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {sectors.map(s => (
                    <li key={s.name} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="flex-1 text-gray-700">{s.name}</span>
                      <span className="tabular-nums text-gray-900">
                        {formatPercent(
                          isNumber(expenditure) && expenditure
                            ? (s.value / expenditure) * 100
                            : null
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState>No sector breakdown in this report.</EmptyState>
            )}
          </ChartCard>
        )}

        {selected && collections.length > 0 && (
          <ChartCard
            title={`Collections vs. annual target, ${periodText}`}
            description="Amount collected so far against each income source’s target for the year."
            sources={sourcesSelected}
          >
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart
                  data={collections}
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
                    width={130}
                    {...axisProps}
                  />
                  <Tooltip formatter={tooltipPeso} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="target"
                    name="Annual target"
                    fill={COLORS.primaryLight}
                  />
                  <Bar
                    dataKey="actual"
                    name="Collected"
                    fill={COLORS.primary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        <ChartCard
          title="Reliance on the National Tax Allotment"
          description="Share of current operating income that comes from the national government’s allotment (IRA until 2021, NTA after)."
          sources={sourcesAll}
        >
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis
                  tickFormatter={v => `${v}%`}
                  domain={[0, 100]}
                  width={40}
                  {...axisProps}
                />
                <Tooltip
                  formatter={v => formatPercent(v as number)}
                  labelFormatter={(_, p) => p?.[0]?.payload.period}
                />
                <Line
                  dataKey="ntaShare"
                  name="NTA share of income"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {quarters.length > 1 && (
          <ChartCard
            title={`${year} quarter by quarter`}
            description="Year-to-date totals at the end of each quarter."
            sources={sourcesOf(entries.filter(e => e.year === year))}
          >
            <div className="h-60">
              <ResponsiveContainer>
                <LineChart data={quarters} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis tickFormatter={axisPeso} width={64} {...axisProps} />
                  <Tooltip formatter={tooltipPeso} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    dataKey="income"
                    name="Operating income"
                    stroke={COLORS.income}
                    strokeWidth={2}
                  />
                  <Line
                    dataKey="expenditure"
                    name="Operating expenditures"
                    stroke={COLORS.expense}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {selected && statement && (
        <ChartCard
          title={`Full statement, ${periodText}`}
          description="Every line of the Statement of Receipts and Expenditures, as printed (amounts in pesos)."
          sources={sourcesSelected}
          onDownload={() => {
            const main = statement.tables.find(t => t.key === 'main');
            if (!main) return;
            downloadCsv(
              `lapu-lapu-sre-${selected.id}`,
              [
                { header: 'Particulars', value: r => r.label },
                ...main.columns.map(c => ({
                  header: `${c.label}${c.type === 'amount' ? ' (PHP)' : ''}`,
                  value: (r: (typeof main.rows)[number]) => r.values[c.key],
                })),
              ],
              main.rows
            );
          }}
        >
          {statement.tables
            .filter(t => t.key === 'main')
            .map(t => (
              <StatementTable key={t.key} table={t} />
            ))}
        </ChartCard>
      )}

      <AboutThisData>
        <p>
          The Statement of Receipts and Expenditures (SRE) is a quarterly report
          the City Treasurer files with the Bureau of Local Government Finance.
          Its figures are cumulative from January. “Current operating income” is
          regular revenue (taxes, fees, the national allotment); it excludes
          borrowings and the cash balance carried over from earlier years.
        </p>
        <p>
          Figures cover the General Fund and the Special Education Fund (SEF).
          The 2022 statement also reports trust funds (e.g. national grants);
          those are left out here so every year is measured the same way, but
          they appear in that year’s full statement.
        </p>
      </AboutThisData>
    </div>
  );
}
