import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { CheckCircle2, ClipboardList, Coins, Wallet } from 'lucide-react';
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
import { cn } from '../../../lib/utils';
import type {
  Funds,
  LdrrmfEntry,
  Project,
  ProjectFundEntry,
  SefEntry,
} from '../../../types/fdp';
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
import { latestForYear, partialLabel, sourcesOf, sum } from '../selectors';

const TABS = ['development', 'ldrrmf', 'sef', 'trust'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  development: '20% Development Fund',
  ldrrmf: 'Disaster Risk Reduction (LDRRMF)',
  sef: 'Special Education Fund',
  trust: 'Trust Fund',
};

const SECTION_LABELS: Record<string, string> = {
  social: 'Social development',
  environmental: 'Environmental development',
  economic: 'Economic development',
  institutional: 'Institutional development',
};

function periodOf(e: { year: number; quarter: number | null }) {
  const partial = partialLabel(e);
  return `${formatPeriod(e.year, e.quarter)}${partial ? `, ${partial}` : ''}`;
}

function NoReport({ what, year }: { what: string; year: number }) {
  return (
    <EmptyState>
      No {what} report has been transcribed for {year}. Pick another year above,
      or see the Source Documents tab.
    </EmptyState>
  );
}

// ------------------------------------------------------------ project funds
const projectColumns: Column<Project>[] = [
  {
    key: 'name',
    header: 'Program / project',
    value: r => r.name,
    className: 'min-w-56',
  },
  {
    key: 'section',
    header: 'Sector',
    value: r => (r.section ? SECTION_LABELS[r.section] || r.section : null),
  },
  { key: 'location', header: 'Location', value: r => r.location },
  {
    key: 'totalCost',
    header: 'Total cost',
    value: r => r.totalCost,
    render: r => formatPeso(r.totalCost),
    align: 'right',
  },
  {
    key: 'costIncurred',
    header: 'Spent to date',
    value: r => r.costIncurred,
    render: r => formatPeso(r.costIncurred),
    align: 'right',
  },
  {
    key: 'pctCompletion',
    header: 'Done',
    value: r => r.pctCompletion,
    render: r =>
      isNumber(r.pctCompletion) ? (
        <span className="inline-flex items-center gap-2">
          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 lg:inline-block">
            <span
              className="block h-full bg-primary-600"
              style={{ width: `${Math.min(100, r.pctCompletion)}%` }}
            />
          </span>
          {formatPercent(r.pctCompletion, 0)}
        </span>
      ) : (
        '—'
      ),
    align: 'right',
  },
  { key: 'remarks', header: 'Status', value: r => r.remarks },
];

function ProjectFund({
  entries,
  year,
  name,
}: {
  entries: ProjectFundEntry[];
  year: number;
  name: string;
}) {
  const selected = latestForYear(entries, year);
  if (!selected) return <NoReport what={name} year={year} />;
  const { projects } = selected;
  const totalCost = selected.summary.totalCost;
  const spent = selected.summary.costIncurred;
  const done = projects.filter(p => (p.pctCompletion ?? 0) >= 100).length;

  const bySection = Object.entries(
    projects.reduce<Record<string, { cost: number; spent: number }>>(
      (acc, p) => {
        const key = p.section || 'other';
        acc[key] ??= { cost: 0, spent: 0 };
        acc[key].cost += p.totalCost ?? 0;
        acc[key].spent += p.costIncurred ?? 0;
        return acc;
      },
      {}
    )
  ).map(([key, v]) => ({ name: SECTION_LABELS[key] || key, ...v }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Showing <strong>{periodOf(selected)}</strong>.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Programmed cost"
          value={formatPeso(totalCost, { compact: true })}
          subtext={
            isNumber(selected.summary.printedTotalCost) &&
            Math.abs(selected.summary.printedTotalCost - totalCost) > 1
              ? `Sum of listed projects. The report prints a total of ${formatPeso(selected.summary.printedTotalCost)}.`
              : formatPeso(totalCost)
          }
          icon={Coins}
        />
        <StatCard
          label="Spent to date"
          value={formatPeso(spent, { compact: true })}
          subtext={formatPeso(spent)}
          icon={Wallet}
          tone="expense"
        />
        <StatCard
          label="Utilization"
          value={totalCost ? formatPercent((spent / totalCost) * 100) : '—'}
          subtext="Spent to date ÷ programmed cost"
          icon={CheckCircle2}
          tone="income"
        />
        <StatCard
          label="Projects"
          value={String(selected.summary.projectCount)}
          subtext={`${done} reported 100% complete`}
          icon={ClipboardList}
          tone="neutral"
        />
      </div>
      {bySection.length > 1 && (
        <ChartCard
          title="Cost and spending by sector"
          description="Programmed cost vs. amount spent so far."
          sources={sourcesOf([selected])}
        >
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={bySection} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis tickFormatter={axisPeso} width={64} {...axisProps} />
                <Tooltip formatter={tooltipPeso} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="cost"
                  name="Programmed cost"
                  fill={COLORS.primaryLight}
                />
                <Bar
                  dataKey="spent"
                  name="Spent to date"
                  fill={COLORS.primary}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
      <ChartCard
        title="Projects"
        description="Every program and project listed in the report."
        sources={sourcesOf([selected])}
        onDownload={() =>
          downloadCsv(
            `lapu-lapu-${selected.id}-projects`,
            [
              { header: 'Program/project', value: r => r.name },
              { header: 'Sector', value: r => r.section },
              { header: 'Appropriation', value: r => r.appropriation },
              { header: 'Location', value: r => r.location },
              { header: 'Total cost (PHP)', value: r => r.totalCost },
              { header: 'Date started', value: r => r.dateStarted },
              { header: 'Target completion', value: r => r.targetCompletion },
              { header: '% completion', value: r => r.pctCompletion },
              {
                header: 'Cost incurred to date (PHP)',
                value: r => r.costIncurred,
              },
              { header: 'Remarks', value: r => r.remarks },
            ],
            projects
          )
        }
      >
        <DataTable
          columns={projectColumns}
          rows={projects}
          rowKey={(r, i) => `${i}-${r.name}`}
          searchPlaceholder="Search projects or locations"
          initialSort={{ key: 'totalCost', dir: 'desc' }}
        />
      </ChartCard>
    </div>
  );
}

// ------------------------------------------------------------ LDRRMF
function Ldrrmf({ entries, year }: { entries: LdrrmfEntry[]; year: number }) {
  const selected = latestForYear(entries, year);
  if (!selected) return <NoReport what="LDRRM Fund" year={year} />;
  const s = selected.summary;
  const utilized =
    s.totalUtilized ?? sum(selected.utilization.map(u => u.amount));
  const split = [
    {
      name: 'Quick Response Fund (30%)',
      value: s.qrf ?? 0,
      color: COLORS.accent,
    },
    {
      name: 'Mitigation and preparedness (70%)',
      value: s.mitigation ?? 0,
      color: COLORS.primary,
    },
  ].filter(x => x.value > 0);
  const byMonth = Object.entries(
    selected.utilization.reduce<Record<string, number>>((acc, u) => {
      const key = u.month || 'Unspecified';
      acc[key] = (acc[key] ?? 0) + (u.amount ?? 0);
      return acc;
    }, {})
  ).map(([month, amount]) => ({ month, amount }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Showing <strong>{periodOf(selected)}</strong>.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Fund available"
          value={formatPeso(s.totalAvailable, { compact: true })}
          subtext={formatPeso(s.totalAvailable)}
          icon={Coins}
        />
        <StatCard
          label="Used"
          value={formatPeso(utilized, { compact: true })}
          subtext={formatPeso(utilized)}
          icon={Wallet}
          tone="expense"
        />
        <StatCard
          label="Utilization"
          value={
            isNumber(s.totalAvailable) && s.totalAvailable
              ? formatPercent((utilized / s.totalAvailable) * 100)
              : '—'
          }
          icon={CheckCircle2}
          tone="income"
        />
        <StatCard
          label="Balance"
          value={formatPeso(s.balance, { compact: true })}
          subtext={formatPeso(s.balance)}
          icon={ClipboardList}
          tone="neutral"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {split.length > 0 && (
          <ChartCard
            title="How the fund is split"
            description="By law, 30% is held as a Quick Response Fund for disasters; 70% goes to mitigation and preparedness."
            sources={sourcesOf([selected])}
          >
            <div className="h-60">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={split}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="90%"
                  >
                    {split.map(x => (
                      <Cell key={x.name} fill={x.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipPeso} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
        {byMonth.length > 1 && (
          <ChartCard
            title="Spending by month"
            description="Disbursements grouped as printed in the report."
            sources={sourcesOf([selected])}
          >
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={byMonth} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis tickFormatter={axisPeso} width={64} {...axisProps} />
                  <Tooltip formatter={tooltipPeso} />
                  <Bar
                    dataKey="amount"
                    name="Disbursed"
                    fill={COLORS.primary}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>
      <ChartCard
        title="Disbursements"
        sources={sourcesOf([selected])}
        onDownload={() =>
          downloadCsv(
            `lapu-lapu-${selected.id}`,
            [
              { header: 'Month', value: r => r.month },
              { header: 'Particulars', value: r => r.item },
              { header: 'Amount (PHP)', value: r => r.amount },
            ],
            selected.utilization
          )
        }
      >
        <DataTable
          columns={[
            { key: 'month', header: 'Month', value: r => r.month },
            {
              key: 'item',
              header: 'Particulars',
              value: r => r.item,
              className: 'min-w-64',
            },
            {
              key: 'amount',
              header: 'Amount',
              value: r => r.amount,
              render: r => formatPeso(r.amount),
              align: 'right',
            },
          ]}
          rows={selected.utilization}
          rowKey={(_, i) => String(i)}
          searchPlaceholder="Search disbursements"
        />
      </ChartCard>
    </div>
  );
}

// ------------------------------------------------------------ SEF
function Sef({ entries, year }: { entries: SefEntry[]; year: number }) {
  const selected = latestForYear(entries, year);
  if (!selected) return <NoReport what="Special Education Fund" year={year} />;
  const s = selected.summary;
  const classes = [
    { name: 'Personnel services', value: s.ps ?? 0, color: SERIES[0] },
    {
      name: 'Maintenance and operating expenses',
      value: s.mooe ?? 0,
      color: SERIES[1],
    },
    { name: 'Capital outlay', value: s.capitalOutlay ?? 0, color: SERIES[2] },
  ].filter(x => x.value > 0);
  const trend = entries
    .filter(e => e.quarter)
    .map(e => ({
      label: formatPeriod(e.year, e.quarter),
      receipts: e.summary.receipts ?? null,
      disbursements: e.summary.totalDisbursements ?? null,
    }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Showing <strong>{periodOf(selected)}</strong>.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="SEF receipts"
          value={formatPeso(s.receipts, { compact: true })}
          subtext={formatPeso(s.receipts)}
          icon={Coins}
          tone="income"
        />
        <StatCard
          label="Disbursed"
          value={formatPeso(s.totalDisbursements, { compact: true })}
          subtext={
            isNumber(s.receipts) && isNumber(s.totalDisbursements) && s.receipts
              ? `${formatPercent((s.totalDisbursements / s.receipts) * 100)} of receipts`
              : undefined
          }
          icon={Wallet}
          tone="expense"
        />
        <StatCard
          label="Balance"
          value={formatPeso(s.balance, { compact: true })}
          subtext={formatPeso(s.balance)}
          icon={ClipboardList}
          tone="neutral"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {classes.length > 0 && (
          <ChartCard
            title="What the SEF paid for"
            description="Disbursements by expense class."
            sources={sourcesOf([selected])}
          >
            <div className="h-60">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={classes}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="90%"
                  >
                    {classes.map(x => (
                      <Cell key={x.name} fill={x.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipPeso} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
        {trend.length > 1 && (
          <ChartCard
            title="Receipts and disbursements over time"
            description="Year-to-date figures from each quarterly report."
            sources={sourcesOf(entries)}
          >
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={trend} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    {...axisProps}
                    interval="preserveStartEnd"
                  />
                  <YAxis tickFormatter={axisPeso} width={64} {...axisProps} />
                  <Tooltip formatter={tooltipPeso} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="receipts"
                    name="Receipts"
                    fill={COLORS.income}
                  />
                  <Bar
                    dataKey="disbursements"
                    name="Disbursements"
                    fill={COLORS.expense}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>
      <ChartCard
        title="Disbursements by object of expenditure"
        sources={sourcesOf([selected])}
        onDownload={() =>
          downloadCsv(
            `lapu-lapu-${selected.id}`,
            [
              { header: 'Expense class', value: r => r.section },
              { header: 'Object of expenditure', value: r => r.label },
              { header: 'Amount (PHP)', value: r => r.amount },
            ],
            selected.lines
          )
        }
      >
        <DataTable
          columns={[
            {
              key: 'label',
              header: 'Object of expenditure',
              value: r => r.label,
            },
            {
              key: 'section',
              header: 'Class',
              value: r =>
                ({
                  ps: 'Personnel',
                  mooe: 'MOOE',
                  capitalOutlay: 'Capital outlay',
                  receipts: 'Receipts',
                })[r.section || ''] || r.section,
            },
            {
              key: 'amount',
              header: 'Amount',
              value: r => r.amount,
              render: r => formatPeso(r.amount),
              align: 'right',
            },
          ]}
          rows={selected.lines}
          rowKey={(r, i) => `${i}-${r.label}`}
          initialSort={{ key: 'amount', dir: 'desc' }}
        />
      </ChartCard>
    </div>
  );
}

// ------------------------------------------------------------ section
export default function FundsSection({
  funds,
  year,
}: {
  funds: Funds;
  year: number;
}) {
  const [tab, setTab] = useQueryState(
    'fund',
    parseAsStringLiteral(TABS).withDefault('development')
  );
  const trust = [...funds.trustFund, ...funds.projectStatus];

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Fund"
        className="flex flex-wrap gap-2 border-b border-gray-200"
      >
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              tab === t
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'development' && (
        <ProjectFund
          entries={funds.developmentFund}
          year={year}
          name="20% Development Fund"
        />
      )}
      {tab === 'ldrrmf' && <Ldrrmf entries={funds.ldrrmf} year={year} />}
      {tab === 'sef' && <Sef entries={funds.sef} year={year} />}
      {tab === 'trust' && (
        <ProjectFund entries={trust} year={year} name="Trust Fund" />
      )}

      <AboutThisData>
        {tab === 'development' && (
          <p>
            Cities must set aside at least 20% of their National Tax Allotment
            for development projects. This quarterly report (FDP Form 7) lists
            each funded project with its cost, progress and amount spent.
          </p>
        )}
        {tab === 'ldrrmf' && (
          <p>
            At least 5% of regular revenue goes to the Local Disaster Risk
            Reduction and Management Fund. 30% of it is kept as a Quick Response
            Fund for relief and recovery; unspent balances roll into a special
            trust fund for five years.
          </p>
        )}
        {tab === 'sef' && (
          <p>
            The Special Education Fund comes from the additional 1% real
            property tax and supports public schools through the Local School
            Board.
          </p>
        )}
        {tab === 'trust' && (
          <p>
            Trust funds hold money received for a specific purpose, such as
            national government grants, and can only be spent on that purpose.
          </p>
        )}
      </AboutThisData>
    </div>
  );
}
