// Shapes of the generated files in public/data/fdp/
// (built by scripts/fdp/build-fdp-data.js from data/fdp/json/).

export interface Dataset<T> {
  metadata: {
    title: string;
    source: string;
    generatedAt: string;
    unit?: string;
  };
  data: T;
}

/** Period and source reference carried by every dataset row. */
export interface DocRef {
  id: string;
  year: number;
  quarter: number | null;
  asOf: string | null;
  title: string;
  sourceUrl: string;
  notes?: string[];
}

export type CellValue = number | string | null;
export type Values = Record<string, CellValue>;

export interface CatalogDocument {
  id: string;
  type: string;
  title: string;
  year: number;
  quarter: number | null;
  publishedYear: number;
  publishedQuarter: number | null;
  periodPrinted: string | null;
  pages: number | null;
  sourceUrl: string;
  transcribed: boolean;
  duplicateOf: string | null;
  notes: string[];
}

export interface Catalog {
  types: Record<string, string>;
  documents: CatalogDocument[];
}

export interface SreEntry extends DocRef {
  cumulative: boolean;
  columns: string[];
  lines: Record<string, Values>;
  totalAssets: number | null;
}

export interface Project {
  name: string;
  section: string | null;
  appropriation: string | null;
  location: CellValue;
  totalCost: number | null;
  dateStarted: CellValue;
  targetCompletion: CellValue;
  pctCompletion: number | null;
  costIncurred: number | null;
  remarks: CellValue;
}

export interface ProjectFundEntry extends DocRef {
  summary: { totalCost: number; costIncurred: number; projectCount: number };
  projects: Project[];
}

export interface KeyedRow {
  key: string | null;
  label: string;
  kind: string;
  values: Values;
}

export interface LdrrmfEntry extends DocRef {
  summary: Partial<
    Record<
      'totalAvailable' | 'qrf' | 'mitigation' | 'totalUtilized' | 'balance',
      number | null
    >
  >;
  sources: KeyedRow[];
  utilization: {
    item: string;
    month: string | null;
    fund: string | null;
    amount: number | null;
  }[];
}

export interface SefEntry extends DocRef {
  summary: Partial<
    Record<
      | 'receipts'
      | 'ps'
      | 'mooe'
      | 'capitalOutlay'
      | 'totalDisbursements'
      | 'balance',
      number | null
    >
  >;
  lines: { label: string; section: string | null; amount: number }[];
}

export interface Funds {
  developmentFund: ProjectFundEntry[];
  trustFund: ProjectFundEntry[];
  projectStatus: ProjectFundEntry[];
  ldrrmf: LdrrmfEntry[];
  sef: SefEntry[];
}

export interface BidRow {
  docId: string;
  year: number;
  quarter: number | null;
  sourceUrl: string;
  category: string;
  refNo: CellValue;
  description: string;
  location: CellValue;
  abc: number | null;
  bidder: string | null;
  bidderAddress: CellValue;
  bidAmount: number | null;
  biddingDate: CellValue;
  duration: CellValue;
}

export interface WorkforceEntry extends DocRef {
  columns: { key: string; label: string; type: string }[];
  rows: KeyedRow[];
}

export interface Loan {
  lender: string | null;
  purpose: string | null;
  principal: number | null;
  interestRate: number | null;
  dateContracted: string | null;
  term: string | null;
  paidPrincipal: number | null;
  paidInterest: number | null;
  outstanding: number | null;
}

export interface DebtEntry extends DocRef {
  loans: Loan[];
  totalOutstanding: number | null;
}

export interface BudgetOffice {
  key: string;
  office: string;
  ps: number | null;
  mooe: number | null;
  capitalOutlay: number | null;
  total: number | null;
}

export interface BudgetEntry extends DocRef {
  type: 'annual-budget' | 'sef-budget';
  offices: BudgetOffice[];
  summary?: Record<string, number | null>;
  tableCount: number;
}

/** A full transcription (public/data/fdp/docs/{id}.json). */
export interface FdpColumn {
  key: string;
  label: string;
  type: 'amount' | 'number' | 'percent' | 'text' | 'date';
}

export interface FdpRow {
  key?: string;
  label: string;
  level?: number;
  kind?: 'item' | 'subtotal' | 'total' | 'header';
  section?: string;
  values: Values;
}

export interface FdpTable {
  key: string;
  title?: string;
  columns: FdpColumn[];
  rows: FdpRow[];
}

export interface FdpDocument {
  id: string;
  type: string;
  title: string;
  period: {
    year: number;
    quarter: number | null;
    asOf?: string | null;
    printed: string;
    cumulative?: boolean;
  };
  certifiedBy?: { name: string; position: string }[];
  tables: FdpTable[];
  notes?: string[];
}
