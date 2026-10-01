import { AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

export function AboutThisData({ children }: { children: ReactNode }) {
  return (
    <aside className="flex gap-3 rounded-md border-l-4 border-primary-500 bg-primary-50 p-4 text-sm text-gray-700">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
      <div className="space-y-1.5">
        <p className="font-semibold text-gray-900">About this data</p>
        {children}
      </div>
    </aside>
  );
}

export function DataDisclaimer() {
  return (
    <aside className="flex gap-3 rounded-md border-l-4 border-accent-500 bg-accent-50 p-4 text-sm text-gray-700">
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-accent-600"
        aria-hidden
      />
      <div className="space-y-1.5">
        <p className="font-semibold text-gray-900">Data disclaimer</p>
        <p>
          These figures were transcribed from scanned PDF reports the City
          Government posts under the Full Disclosure Policy. Each value was
          checked against the totals printed on its form, but transcription
          errors are still possible. The official PDF linked under every chart
          and table is the authoritative record.
        </p>
        <p>
          Quarterly reports are cumulative: a Q3 figure covers January to
          September. Years without a fourth-quarter report show the latest
          quarter available and are labelled as year-to-date.
        </p>
      </div>
    </aside>
  );
}
