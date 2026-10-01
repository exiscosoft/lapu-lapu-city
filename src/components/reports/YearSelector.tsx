import { cn } from '../../lib/utils';

interface YearSelectorProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

/** Pill tabs for the fiscal year, newest first. */
export default function YearSelector({
  years,
  value,
  onChange,
}: YearSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Fiscal year"
      className="flex gap-1.5 overflow-x-auto pb-1"
    >
      {years.map(year => (
        <button
          key={year}
          type="button"
          role="tab"
          aria-selected={year === value}
          onClick={() => onChange(year)}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
            year === value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
