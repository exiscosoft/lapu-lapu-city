import { parseAsInteger, useQueryState } from 'nuqs';
import {
  ArrowRight,
  Banknote,
  FileSignature,
  Landmark,
  Percent,
  Users,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../../components/SEO';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import { Heading } from '../../components/ui/Heading';
import Section from '../../components/ui/Section';
import { DataDisclaimer } from '../../components/reports/AboutThisData';
import ChartCard from '../../components/reports/ChartCard';
import CoverageMatrix from '../../components/reports/CoverageMatrix';
import StatCard from '../../components/reports/StatCard';
import YearSelector from '../../components/reports/YearSelector';
import {
  REPORTS_PATH,
  REPORT_SECTIONS,
  sectionBySlug,
} from '../../components/reports/sections';
import BudgetSection from '../../components/reports/sections/BudgetSection';
import DebtSection from '../../components/reports/sections/DebtSection';
import DocumentsSection from '../../components/reports/sections/DocumentsSection';
import FinancesSection from '../../components/reports/sections/FinancesSection';
import FundsSection from '../../components/reports/sections/FundsSection';
import ProcurementSection from '../../components/reports/sections/ProcurementSection';
import WorkforceSection from '../../components/reports/sections/WorkforceSection';
import { headcountOf } from '../../components/reports/workforce';
import {
  latestForYear,
  partialLabel,
  sreTotal,
  sum,
} from '../../components/reports/selectors';
import { useFdpData, type FdpDatasets } from '../../hooks/useFdpData';
import {
  formatNumber,
  formatPercent,
  formatPeriod,
  formatPeso,
  isNumber,
} from '../../lib/format';
import { cn } from '../../lib/utils';

const governmentName = import.meta.env.VITE_GOVERNMENT_NAME || 'the City';

function availableYears(data: FdpDatasets) {
  const years = new Set<number>([
    ...data.finances.map(e => e.year),
    ...data.funds.developmentFund.map(e => e.year),
    ...data.funds.ldrrmf.map(e => e.year),
    ...data.funds.sef.map(e => e.year),
    ...data.procurement.map(e => e.year),
    ...data.workforce.map(e => e.year),
    ...data.debt.map(e => e.year),
    ...data.budget.map(e => e.year),
  ]);
  if (!years.size) data.catalog.documents.forEach(d => years.add(d.year));
  return [...years].sort((a, b) => b - a);
}

function Overview({ data, year }: { data: FdpDatasets; year: number }) {
  const sre = latestForYear(data.finances, year);
  const income = sreTotal(sre, 'totalCurrentOperatingIncome');
  const expenditure = sreTotal(sre, 'totalCurrentOperatingExpenditures');
  const nta = sreTotal(sre, 'nta');
  const hr = latestForYear(data.workforce, year);
  const headcount = hr ? headcountOf(hr) : null;
  const bids = data.procurement.filter(r => r.year === year);
  const debt = latestForYear(data.debt, year);
  const periodNote = (e?: { year: number; quarter: number | null }) =>
    e
      ? partialLabel(e) || `As of ${formatPeriod(e.year, e.quarter)}`
      : 'No report for this year';

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Current operating income"
          value={formatPeso(income, { compact: true })}
          subtext={periodNote(sre)}
          icon={Banknote}
          tone="income"
          title={formatPeso(income)}
        />
        <StatCard
          label="Current operating expenditures"
          value={formatPeso(expenditure, { compact: true })}
          subtext={periodNote(sre)}
          icon={Landmark}
          tone="expense"
          title={formatPeso(expenditure)}
        />
        <StatCard
          label="Reliance on national allotment"
          value={
            isNumber(nta) && nta > 0 && isNumber(income) && income
              ? formatPercent((nta / income) * 100)
              : '—'
          }
          subtext="NTA as a share of operating income"
          icon={Percent}
          tone="neutral"
        />
        <StatCard
          label="Contracts awarded"
          value={
            bids.length
              ? formatPeso(sum(bids.map(b => b.bidAmount)), { compact: true })
              : '—'
          }
          subtext={
            bids.length
              ? `${bids.length} contracts in transcribed bid results`
              : 'No bid results for this year'
          }
          icon={FileSignature}
        />
        <StatCard
          label="City personnel"
          value={isNumber(headcount) ? formatNumber(headcount) : '—'}
          subtext={periodNote(hr)}
          icon={Users}
          tone="accent"
        />
        <StatCard
          label="Outstanding debt"
          value={formatPeso(debt?.totalOutstanding, { compact: true })}
          subtext={periodNote(debt)}
          icon={Wallet}
          tone="neutral"
          title={formatPeso(debt?.totalOutstanding)}
        />
      </div>

      <div>
        <Heading level={2} className="text-xl">
          Explore the reports
        </Heading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_SECTIONS.map(s => (
            <Link
              key={s.slug}
              to={`${REPORTS_PATH}/${s.slug}${s.slug === 'documents' ? '' : `?year=${year}`}`}
              className="group flex flex-col rounded-lg border border-gray-200 border-t-4 border-t-primary-500 bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-primary-100 p-2 text-primary-600">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
              </div>
              <p className="mt-3 flex-1 text-sm text-gray-600">
                {s.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:gap-2">
                View {s.short.toLowerCase()}
                <ArrowRight className="h-4 w-4 transition-all" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <ChartCard
        title="What has been published"
        description="Full Disclosure Policy reports posted by the City, by report type and period. Gaps are reports that were not posted online."
      >
        <CoverageMatrix catalog={data.catalog} />
      </ChartCard>
    </div>
  );
}

export default function Reports() {
  const { section: slug } = useParams();
  const section = sectionBySlug(slug);
  const { data, loading, error } = useFdpData();
  const [yearParam, setYear] = useQueryState('year', parseAsInteger);

  const years = useMemo(() => (data ? availableYears(data) : []), [data]);
  const defaultYear =
    (data && [...data.finances].sort((a, b) => b.year - a.year)[0]?.year) ??
    years[0] ??
    new Date().getFullYear();
  const year = yearParam && years.includes(yearParam) ? yearParam : defaultYear;

  const title = section ? section.title : 'Reports and Statistics';
  const description = section
    ? section.description
    : `Budgets, income, spending, procurement and personnel of ${governmentName}, from the reports posted under the Full Disclosure Policy.`;
  const showYear = section?.slug !== 'documents';

  if (slug && !section) {
    return (
      <Section className="p-3 mb-12">
        <Breadcrumbs className="mb-8" />
        <Heading>Report not found</Heading>
        <Link to={REPORTS_PATH} className="text-primary-600 hover:underline">
          Back to Reports and Statistics
        </Link>
      </Section>
    );
  }

  return (
    <>
      <SEO
        title={title}
        description={description}
        keywords="full disclosure policy, budget, receipts and expenditures, procurement, bid results, transparency, Lapu-Lapu City"
      />
      <div className="bg-gray-50">
        <div className="container mx-auto px-4 pt-6 pb-2">
          <Breadcrumbs
            className="mb-6"
            items={[
              { label: 'Home', href: '/' },
              { label: 'Government', href: '/government' },
              {
                label: 'Reports and Statistics',
                href: section ? REPORTS_PATH : undefined,
              },
              ...(section ? [{ label: section.title }] : []),
            ]}
          />
          <Heading>{title}</Heading>
          <p className="max-w-3xl text-gray-600">{description}</p>
        </div>

        <div className="z-20 border-b border-gray-200 bg-gray-50/95 backdrop-blur lg:sticky lg:top-[121px]">
          <div className="container mx-auto flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <nav
              aria-label="Report sections"
              className="flex gap-1 overflow-x-auto"
            >
              {[{ slug: '', short: 'Overview' }, ...REPORT_SECTIONS].map(s => {
                const active = (section?.slug ?? '') === s.slug;
                return (
                  <Link
                    key={s.slug || 'overview'}
                    to={`${REPORTS_PATH}${s.slug ? `/${s.slug}` : ''}${s.slug === 'documents' ? '' : `?year=${year}`}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium',
                      active
                        ? 'bg-white text-primary-700 shadow-xs ring-1 ring-gray-200'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    )}
                  >
                    {s.short}
                  </Link>
                );
              })}
            </nav>
            {showYear && years.length > 0 && (
              <YearSelector
                years={years}
                value={year}
                onChange={y => setYear(y)}
              />
            )}
          </div>
        </div>

        <div className="container mx-auto space-y-8 px-4 py-8">
          {loading && (
            <div className="flex min-h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          )}
          {error && (
            <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              The report data could not be loaded ({error}). Please try again
              later.
            </p>
          )}
          {data && (
            <>
              {!section && <Overview data={data} year={year} />}
              {section?.slug === 'finances' && (
                <FinancesSection entries={data.finances} year={year} />
              )}
              {section?.slug === 'funds' && (
                <FundsSection funds={data.funds} year={year} />
              )}
              {section?.slug === 'procurement' && (
                <ProcurementSection rows={data.procurement} year={year} />
              )}
              {section?.slug === 'budget' && (
                <BudgetSection
                  entries={data.budget}
                  catalog={data.catalog}
                  year={year}
                />
              )}
              {section?.slug === 'workforce' && (
                <WorkforceSection entries={data.workforce} year={year} />
              )}
              {section?.slug === 'debt' && (
                <DebtSection entries={data.debt} year={year} />
              )}
              {section?.slug === 'documents' && (
                <DocumentsSection catalog={data.catalog} />
              )}
              <DataDisclaimer />
            </>
          )}
        </div>
      </div>
    </>
  );
}
