# Full Disclosure Policy (FDP) data

Structured transcriptions of the Full Disclosure Policy documents that
Lapu-Lapu City publishes at <https://lapulapucitygov.ph/fdp>. The PDFs are
scanned images, so every value here was transcribed by reading the page and
then checked with the arithmetic in `scripts/fdp/validate.js`.

```
data/fdp/
  catalog.json              every published document, classified (scripts/fdp/catalog.js)
  json/{type}/{id}.json     one transcription per document (source of truth)
  validation-report.md      output of scripts/fdp/validate.js
```

Markdown versions and the dashboard aggregates in `public/data/fdp/` are
generated from these JSON files by `scripts/fdp/build-fdp-data.js`. Never edit
the generated files.

## Pipeline

```bash
node scripts/fdp/catalog.js              # manifest.csv -> catalog.json
scripts/fdp/render-pages.sh [id-regex]   # PDFs -> downloads/fdp-pages/{id}/p-N.jpg
node scripts/fdp/validate.js [id-regex]  # schema + arithmetic checks
npm run fdp:build                        # -> public/data/fdp/
```

`downloads/` (PDFs and page images) is gitignored. To re-create it, download
the PDFs listed in `catalog.json` (`sourceUrl`) into `downloads/fdp/{file}`.

---

## Transcription rules

1. **Copy what is printed.** Never compute, round, or "fix" a value. If a total
   on the page is wrong, transcribe it as printed and add a `notes` entry.
2. **Amounts are JSON numbers in full pesos** with up to 2 decimals:
   `1,358,864,167.00` → `1358864167`. A printed `-`, `0.00`, or `nil` → `0`.
   A blank cell → `null`. Negative values in parentheses `(1,234.50)` → `-1234.5`.
   If a form says amounts are in thousands _and the figures really are in
   thousands_, multiply to pesos and add a note.
3. **Illegible cells** → `null`, and add the cell's path to `unreadable`, e.g.
   `"tables[0].rows[12].values.sef"`. Do not guess.
4. **Keep the printed label text** in `label` (fix only obvious scan noise).
   Use the canonical `key` when a row matches one in the lists below.
5. **Record the period printed on the page** in `period.printed` exactly as
   shown (e.g. `"Q3, 2025"`, `"As of September 30, 2019"`). If it disagrees
   with the catalog's year/quarter, set `period.year`/`period.quarter` to the
   **printed** period and explain in `notes`.
6. **Dates** → ISO `YYYY-MM-DD` when fully legible, otherwise the printed text.
7. Percentages → numbers without `%` (`57.95%` → `57.95`).
8. Skip signature blocks, but record the certifying officer in `certifiedBy`
   when printed (name and position).

## Document envelope (all types)

```jsonc
{
  "id": "2025-q3-sre", // catalog id; file is json/{type}/{id}.json
  "type": "sre",
  "title": "Statement of Receipts and Expenditures", // as printed on the form
  "form": "BLGF SRE", // printed form name/number, if any
  "period": {
    "year": 2025,
    "quarter": 3, // null for annual documents
    "asOf": "2025-09-30", // end date of the period covered
    "printed": "Q3, 2025",
    "cumulative": true, // true when figures are year-to-date
  },
  "certifiedBy": [
    { "name": "Claire M. Cabalda", "position": "City Treasurer" },
  ],
  "tables": [
    /* one or more tables, see below */
  ],
  "summary": {
    /* type-specific canonical figures, see below */
  },
  "notes": [], // anything a reader should know
  "unreadable": [], // paths of null cells that were illegible
}
```

### Tables

Every tabular region is a table of typed columns and rows. Values are keyed by
column key. A row's `kind` tells the build which rows are items vs subtotals.

```jsonc
{
  "key": "main", // unique within the document
  "title": "Statement of Receipts and Expenditures",
  "columns": [
    {
      "key": "target",
      "label": "Income Target/Budget Appropriation",
      "type": "amount",
    },
    // type: amount | number | percent | text | date
  ],
  "rows": [
    {
      "key": "nta", // canonical key when one applies, else omit
      "label": "National Tax Allotment",
      "level": 1, // indentation depth on the page (0 = top)
      "kind": "item", // item | subtotal | total | header
      "section": "externalSources", // optional grouping key
      "values": {
        "target": 1811818896,
        "generalFund": 1358864167,
        "sef": 0,
        "total": 1358864167,
      },
    },
  ],
}
```

Header rows (section titles with no values) use `"kind": "header"` and
`"values": {}`.

---

## Per-type requirements

### `sre`: Statement of Receipts and Expenditures

One table `main`. Columns use these keys as applicable: `target`,
`generalFund`, `sef`, `trustFund`, `trustLiability`, `total`, `pctOfTotal`.
Canonical row keys (use them whenever the row matches, IRA or NTA → `nta`):

| key                                 | row                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `localSources`                      | LOCAL SOURCES                                                           |
| `taxRevenue`                        | TAX REVENUE                                                             |
| `realPropertyTax`                   | Real Property Tax                                                       |
| `taxOnBusiness`                     | Tax on Business                                                         |
| `otherTaxes`                        | Other Taxes                                                             |
| `nonTaxRevenue`                     | NON-TAX REVENUE                                                         |
| `regulatoryFees`                    | Regulatory Fees (Permits and Licenses)                                  |
| `serviceCharges`                    | Service/User Charges                                                    |
| `economicEnterprises`               | Receipts from Economic Enterprises                                      |
| `otherReceipts`                     | Other Receipts                                                          |
| `externalSources`                   | EXTERNAL SOURCES                                                        |
| `nta`                               | Internal Revenue Allotment / National Tax Allotment                     |
| `otherShares`                       | Other Shares from National Tax Collections                              |
| `interLocalTransfers`               | Inter-Local Transfers                                                   |
| `grants`                            | Extraordinary Receipts/Grants/Donations/Aids                            |
| `totalCurrentOperatingIncome`       | TOTAL CURRENT OPERATING INCOME                                          |
| `supplementalBudgetOperating`       | ADD: Supplemental Budget (Unappropriated Surplus) for Current Operating |
| `totalAvailableOperating`           | TOTAL AVAILABLE FOR CURRENT OPERATING EXPENDITURES                      |
| `generalPublicServices`             | General Public Services                                                 |
| `education`                         | Education, Culture & Sports/Manpower Development                        |
| `health`                            | Health, Nutrition & Population Control                                  |
| `labor`                             | Labor and Employment                                                    |
| `housing`                           | Housing and Community Development                                       |
| `socialWelfare`                     | Social Services and Social Welfare                                      |
| `economicServices`                  | Economic Services                                                       |
| `debtServiceInterest`               | Debt Service (FE) (Interest Expense & Other Charges)                    |
| `totalCurrentOperatingExpenditures` | TOTAL CURRENT OPERATING EXPENDITURES                                    |
| `netOperatingIncome`                | NET OPERATING INCOME/(LOSS) FROM CURRENT OPERATIONS                     |
| `capitalInvestmentReceipts`         | CAPITAL/INVESTMENT RECEIPTS                                             |
| `saleOfAssets`                      | Proceeds from Sale of Assets                                            |
| `saleOfDebtSecurities`              | Proceeds from Sale of Debt Securities of Other Entities                 |
| `collectionOfLoans`                 | Collection of Loans Receivables                                         |
| `loansAndBorrowings`                | RECEIPTS FROM LOANS AND BORROWINGS                                      |
| `acquisitionOfLoans`                | Acquisition of Loans                                                    |
| `issuanceOfBonds`                   | Issuance of Bonds                                                       |
| `otherNonIncomeReceipts`            | OTHER NON-INCOME RECEIPTS                                               |
| `totalNonIncomeReceipts`            | TOTAL NON-INCOME RECEIPTS                                               |
| `supplementalBudgetCapital`         | ADD: Supplemental Budget for Capital Outlay                             |
| `totalAvailableCapital`             | TOTAL AMOUNT AVAILABLE FOR CAPITAL EXPENDITURES                         |
| `capitalInvestmentExpenditures`     | CAPITAL/INVESTMENT EXPENDITURES                                         |
| `capitalOutlay`                     | Purchase/Construct of Property Plant and Equipment                      |
| `investmentOutlay`                  | Purchase of Debt Securities of Other Entities                           |
| `loansToOtherEntities`              | Grant/Make Loan to Other Entities                                       |
| `debtServicePrincipal`              | DEBT SERVICE (Principal Cost)                                           |
| `loanAmortization`                  | Payment of Loan Amortization                                            |
| `bondRedemption`                    | Retirement/Redemption of Bonds/Debt Securities                          |
| `otherNonOperatingExpenditures`     | OTHER NON-OPERATING EXPENDITURES                                        |
| `totalNonOperatingExpenditures`     | TOTAL NON-OPERATING EXPENDITURES                                        |
| `netIncreaseInFunds`                | NET INCREASE/(DECREASE) IN FUNDS                                        |
| `cashBalanceBeginning`              | ADD: CASH BALANCE, BEGINNING                                            |
| `fundCashAvailable`                 | FUND/CASH AVAILABLE                                                     |
| `priorYearPayables`                 | Less: Payment of Prior Year/s Accounts Payable                          |
| `continuingAppropriation`           | CONTINUING APPROPRIATION                                                |
| `advancePaymentRpt`                 | ADD: ADVANCE PAYMENT FOR RPT                                            |
| `fundCashBalanceEnd`                | FUND/CASH BALANCE, END                                                  |
| `totalAssets`                       | Total Assets (net of accumulated depreciation)                          |

The small GF/SEF/TOTAL reconciliation table below the main one goes in a
second table `balance`. `summary` is not needed: the build reads the keyed rows.

### `cash-flows`: Statement of Cash Flows

One table per fund column layout (usually `main`). Use `kind` for
subtotals/totals. `summary` (amounts as printed in the total column):
`{ netOperating, netInvesting, netFinancing, netChange, cashBeginning, cashEnd }`.

### `indebtedness`: Statement of Indebtedness / Debt Service

Transcribe the form as `main` (SIPB forms are label/value pairs: one column
`value`). `summary.loans`: one entry per loan:
`{ lender, purpose, principal, interestRate, dateContracted, term, paidPrincipal, paidInterest, outstanding }`
(numbers or `null`; `interestRate` as percent). Also
`summary.totalOutstanding`.

### `development-fund-20`, `trust-fund`, `project-status`: project utilization forms

One table `projects`. Column keys: `program` (text), `location`, `totalCost`,
`dateStarted`, `targetCompletion`, `pctCompletion`, `costIncurred`,
`extensions`, `remarks`. Add others as printed (e.g. `fundSource`).
Item rows: `kind: "item"`, `section` = `social` | `environmental` |
`economic` | another slug for other printed groupings, and add
`"appropriation": "current" | "continuing"` on the row object when the form
groups by it. Section totals are `kind: "subtotal"` with the same `section`;
the grand total is `kind: "total"`.
`summary`: `{ totalCost, costIncurred, projectCount }` from the printed grand
total (or `null` when the page has none).

### `ldrrmf`: LDRRM Fund Utilization

Table `sources` (Section A, rows with keys `qrf`, `mitigation`, `ndrrmf`,
`otherLgu`, `otherSources`, `total`, and `carryOver:{year}` for the special
trust fund carry-over lines). Table `utilization` (Section B: columns
`date`/`month`, `particulars`, `amount`, plus any printed fund split such as
`qrf`/`mitigation`). `summary`:
`{ totalAvailable, qrf, mitigation, totalUtilized, balance }`.

### `sef`: Special Education Fund Utilization

Table `main` with column `amount`; rows sectioned `receipts`, `ps`, `mooe`,
`capitalOutlay` (+ `capitalOutlayContinuing` if separate). `summary`:
`{ receipts, ps, mooe, capitalOutlay, totalDisbursements, balance }`.

### `sef-budget`: SEF budget, School Board resolutions

Transcribe all tables. `summary`: `{ totalBudget, ps, mooe, capitalOutlay }`
when printed.

### `bid-results`: Bid Results / Bid-Out forms

One table `items`. Column keys: `no`, `refNo`, `description`, `abc` (Approved
Budget for the Contract), `location`, `bidder`, `bidderAddress`, `bidAmount`,
`biddingDate`, `duration`, plus any extra printed columns (`status`,
`remarks`, `fundSource`, `category`). When one PDF holds several forms (civil
works / goods & services / consulting), use one table per form with key
`civilWorks`, `goodsServices` or `consulting`. Set `form` to the printed form
number (e.g. `FDP Form 10a`). `summary`: `{ count, totalAbc, totalBidAmount }`
computed by the transcriber is **not** allowed. Leave `summary` empty; the build
aggregates.

### `hr-complement`: Human Resource / Manpower Complement

Table `main`. Row keys: `permanent`, `elective`, `coterminous`, `casual`,
`contractual`, `jobOrder` (Job Order/Contract of Service), `total`, and others
as printed. Column keys: `count`, `salaries`, `otherBenefits`, `total`, and
others as printed.

### `cash-advances`: Unliquidated Cash Advances

Table `main` (one row per accountable officer/fund as printed). `summary`:
`{ total, count }` from the printed total (`count` = number of rows).

### `annual-budget`: Annual Budget Report / Local Budget Preparation / LEP

The forms (LBP Form 2 and similar) list each office's objects of expenditure.
One table per office/section: `key` = office slug, `title` = printed office
name. Columns: `accountCode`, `object` (text), `pastYear`, `currentSem1`,
`currentSem2`, `currentTotal`, `budgetYear`, or as printed. Rows for
PS/MOOE/Capital Outlay subtotals use `kind: "subtotal"` with `section`
`ps` | `mooe` | `capitalOutlay`; the office total is `kind: "total"`.
`summary.offices`: `[{ key, office, ps, mooe, capitalOutlay, total }]` using
the **budget-year (proposed)** column's printed subtotals. Use `null` for a
missing class.

### `procurement-plan`, `gad`, `bayanihan`, `other`

Transcribe the tables faithfully (`gad` narrative cells as text). `summary`:

- `procurement-plan`: `{ total }` (grand total of estimated budget when printed)
- `gad`: `{ approvedBudget, actualCost }`
- `bayanihan`: `{ grantAmount, utilized, balance }`
