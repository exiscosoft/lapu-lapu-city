import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import SourceLinks, { type SourceRef } from './SourceLinks';

interface ChartCardProps {
  title: string;
  description?: string;
  sources?: SourceRef[];
  onDownload?: () => void;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A titled panel for a chart or table, with its sources and CSV export. */
export default function ChartCard({
  title,
  description,
  sources = [],
  onDownload,
  actions,
  className,
  children,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-xs md:p-5',
        className
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              CSV
            </button>
          )}
        </div>
      </header>
      <div className="min-w-0 flex-1">{children}</div>
      {sources.length > 0 && (
        <footer className="mt-4 border-t border-gray-100 pt-3">
          <SourceLinks sources={sources} />
        </footer>
      )}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}
