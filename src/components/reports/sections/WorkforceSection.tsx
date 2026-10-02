import { Banknote, Briefcase, UserCheck, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsv } from '../../../lib/csv';
import {
  formatNumber,
  formatPercent,
  formatPeriod,
  formatPeso,
  isNumber,
} from '../../../lib/format';
import type { WorkforceEntry } from '../../../types/fdp';
import { AboutThisData } from '../AboutThisData';
import ChartCard, { EmptyState } from '../ChartCard';
import StatCard from '../StatCard';
import StatementTable from '../StatementTable';
import { axisProps, COLORS, SERIES } from '../chartTheme';
import { latestForYear, sourcesOf } from '../selectors';
import { headcountOf, num, rowsOf, STATUS } from '../workforce';

export default function WorkforceSection({
  entries,
  year,
}: {
  entries: WorkforceEntry[];
  year: number;
}) {
  if (!entries.length)
    return (
      <EmptyState>
        Human Resource Complement reports are still being transcribed.
      </EmptyState>
    );

  const selected = latestForYear(entries, year);
  const trend: Record<string, string | number | null>[] = entries.map(e => {
    const { byKey } = rowsOf(e);
    return {
      label: formatPeriod(e.year, e.quarter),
      ...Object.fromEntries(
        STATUS.map(s => [s.key, num(byKey.get(s.key), 'count')])
      ),
    };
  });
  const present = STATUS.filter(s =>
    entries.some(e => rowsOf(e).byKey.has(s.key))
  );

  const sel = selected ? rowsOf(selected) : null;
  const headcount = selected ? headcountOf(selected) : null;
  const cost = num(sel?.total, 'total');
  const permanent = num(sel?.byKey.get('permanent'), 'count');
  const jobOrder = num(sel?.byKey.get('jobOrder'), 'count');

  return (
    <div className="space-y-6">
      {selected ? (
        <>
          <p className="text-sm text-gray-600">
            Showing{' '}
            <strong>{formatPeriod(selected.year, selected.quarter)}</strong>.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total personnel"
              value={formatNumber(headcount)}
              icon={Users}
            />
            <StatCard
              label="Permanent employees"
              value={formatNumber(permanent)}
              subtext={
                isNumber(permanent) && headcount
                  ? `${formatPercent((permanent / headcount) * 100)} of personnel`
                  : undefined
              }
              icon={UserCheck}
              tone="income"
            />
            <StatCard
              label="Job order / contract of service"
              value={formatNumber(jobOrder)}
              subtext={
                isNumber(jobOrder) && headcount
                  ? `${formatPercent((jobOrder / headcount) * 100)} of personnel`
                  : undefined
              }
              icon={Briefcase}
              tone="accent"
            />
            <StatCard
              label="Salaries and benefits"
              value={formatPeso(cost, { compact: true })}
              subtext={cost ? `${formatPeso(cost)} year to date` : undefined}
              icon={Banknote}
              tone="expense"
            />
          </div>
        </>
      ) : (
        <EmptyState>
          No Human Resource Complement report has been transcribed for {year}.
        </EmptyState>
      )}

      <ChartCard
        title="Personnel by employment status"
        description="Headcount at the end of each reported quarter."
        sources={sourcesOf(entries)}
        onDownload={() =>
          downloadCsv(
            'lapu-lapu-personnel-by-status',
            [
              { header: 'Period', value: r => r.label },
              ...present.map(s => ({
                header: s.label,
                value: (r: (typeof trend)[number]) => r[s.key],
              })),
            ],
            trend
          )
        }
      >
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={trend} margin={{ left: 8, right: 8 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={false} />
              <XAxis
                dataKey="label"
                {...axisProps}
                interval="preserveStartEnd"
              />
              <YAxis
                width={56}
                {...axisProps}
                tickFormatter={v => formatNumber(v)}
              />
              <Tooltip formatter={v => formatNumber(v as number)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {present.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="hc"
                  fill={SERIES[i]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {selected && (
        <ChartCard
          title={`Human Resource Complement, ${formatPeriod(selected.year, selected.quarter)}`}
          description="As printed (amounts in pesos)."
          sources={sourcesOf([selected])}
        >
          <StatementTable
            table={{
              key: 'main',
              columns: selected.columns as never,
              rows: selected.rows.map(r => ({
                ...r,
                key: r.key ?? undefined,
                kind: r.kind as 'item',
              })),
            }}
          />
        </ChartCard>
      )}

      <AboutThisData>
        <p>
          The Human Resource Complement lists the City Government’s personnel by
          employment status with their salaries and other benefits. Job order
          and contract-of-service workers are not government employees and are
          paid from operating expenses.
        </p>
      </AboutThisData>
    </div>
  );
}
