import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

const tones = {
  primary: 'border-l-primary-500 text-primary-600 bg-primary-50',
  income: 'border-l-green-600 text-green-700 bg-green-50',
  expense: 'border-l-red-600 text-red-700 bg-red-50',
  accent: 'border-l-accent-500 text-accent-700 bg-accent-50',
  neutral: 'border-l-gray-400 text-gray-600 bg-gray-50',
};

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
  title?: string;
}

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'primary',
  title,
}: StatCardProps) {
  const [border, text, bg] = tones[tone].split(' ');
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 border-l-4 bg-white p-4 shadow-xs',
        border
      )}
      title={title}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {Icon && (
          <span className={cn('rounded-md p-1.5', bg, text)}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
        {value}
      </p>
      {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
    </div>
  );
}
