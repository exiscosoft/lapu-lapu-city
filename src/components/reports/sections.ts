import {
  Banknote,
  FileStack,
  Gavel,
  Landmark,
  PiggyBank,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export const REPORTS_PATH = '/government/reports-and-statistics';

export interface ReportSectionInfo {
  slug: string;
  title: string;
  short: string;
  description: string;
  icon: LucideIcon;
}

export const REPORT_SECTIONS: ReportSectionInfo[] = [
  {
    slug: 'finances',
    title: 'Income and Expenditures',
    short: 'Finances',
    description:
      'Where the City’s money comes from and how it is spent, from the quarterly Statement of Receipts and Expenditures.',
    icon: Banknote,
  },
  {
    slug: 'funds',
    title: 'Fund Utilization',
    short: 'Funds',
    description:
      '20% Development Fund projects, disaster risk reduction (LDRRMF), Special Education Fund and Trust Fund spending.',
    icon: PiggyBank,
  },
  {
    slug: 'procurement',
    title: 'Procurement and Bid Results',
    short: 'Procurement',
    description:
      'Contracts awarded for civil works, goods and services, and consulting, with winning bidders and amounts.',
    icon: Gavel,
  },
  {
    slug: 'budget',
    title: 'Annual Budget',
    short: 'Budget',
    description:
      'Approved and proposed budgets by office, split into personnel, operating expenses and capital outlay.',
    icon: Landmark,
  },
  {
    slug: 'workforce',
    title: 'Workforce',
    short: 'Workforce',
    description:
      'City Government personnel by employment status and what they cost, from the Human Resource Complement.',
    icon: Users,
  },
  {
    slug: 'debt',
    title: 'Debt',
    short: 'Debt',
    description:
      'Outstanding loans and payments from the Statement of Indebtedness, Payments and Balances.',
    icon: Wallet,
  },
  {
    slug: 'documents',
    title: 'Source Documents',
    short: 'Documents',
    description:
      'Every Full Disclosure Policy report the City has posted, with the official PDF and its transcription.',
    icon: FileStack,
  },
];

export const sectionBySlug = (slug: string | undefined) =>
  REPORT_SECTIONS.find(s => s.slug === slug);
