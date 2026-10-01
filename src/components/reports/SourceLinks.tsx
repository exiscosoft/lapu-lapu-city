import { FileText } from 'lucide-react';
import { formatPeriod } from '../../lib/format';

export interface SourceRef {
  id: string;
  title: string;
  year: number;
  quarter: number | null;
  sourceUrl: string;
}

/** "Source: <document> (PDF)" links to the official FDP postings. */
export default function SourceLinks({
  sources,
  max = 6,
}: {
  sources: SourceRef[];
  max?: number;
}) {
  if (!sources.length) return null;
  const unique = [...new Map(sources.map(s => [s.id, s])).values()];
  const shown = unique.slice(-max).reverse();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
      <span className="font-medium">Source:</span>
      {shown.map(s => (
        <a
          key={s.id}
          href={s.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
        >
          <FileText className="h-3 w-3" aria-hidden />
          {s.title} ({formatPeriod(s.year, s.quarter)}, PDF)
        </a>
      ))}
      {unique.length > shown.length && (
        <span>and {unique.length - shown.length} earlier documents</span>
      )}
    </div>
  );
}
