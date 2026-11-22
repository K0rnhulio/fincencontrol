import React from 'react';
import { PieChart, BarChart3 } from 'lucide-react';
import { SummaryStats } from '../types';
import { formatVND } from '../utils/format';

interface ChartsSectionProps {
  summary: SummaryStats;
  onSelectCategory?: (category: string) => void;
}

const CATEGORY_COLORS = [
  'bg-teal-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-orange-500',
];

export const ChartsSection: React.FC<ChartsSectionProps> = ({ summary, onSelectCategory }) => {
  const maxMonthValue = Math.max(
    1,
    ...summary.byMonth.flatMap((m) => [m.added, m.spent])
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      {/* Where the money went */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <PieChart className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Where the Money Went</h2>
          </div>
          <span className="text-xs text-slate-400">Tap to filter</span>
        </div>

        {summary.byCategory.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No payments yet. Tap <strong>Add Bank Slip</strong> to add your first one.
          </div>
        ) : (
          <div className="space-y-3.5">
            {summary.byCategory.slice(0, 7).map((item, idx) => {
              const pct =
                summary.totalSpent > 0
                  ? Math.round((item.total / summary.totalSpent) * 100)
                  : 0;
              const barColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => onSelectCategory?.(item.category)}
                  className="w-full text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-700 font-semibold group-hover:text-teal-600 transition">
                      {item.category}{' '}
                      <span className="text-slate-400 font-normal">({item.count})</span>
                    </span>
                    <span className="font-mono-num font-semibold text-slate-700">
                      {formatVND(item.total)}{' '}
                      <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Monthly Summary</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Added
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Spent
            </span>
          </div>
        </div>

        {summary.byMonth.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Your monthly totals will appear here.
          </div>
        ) : (
          <div className="space-y-3.5">
            {summary.byMonth.map((m) => {
              const addedWidth = Math.round((m.added / maxMonthValue) * 100);
              const spentWidth = Math.round((m.spent / maxMonthValue) * 100);
              return (
                <div key={m.month} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-num text-slate-700 font-semibold">{m.month}</span>
                    <div className="flex items-center gap-3 font-mono-num text-xs font-medium">
                      <span className="text-emerald-600">+{formatVND(m.added)}</span>
                      <span className="text-rose-500">-{formatVND(m.spent)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${m.added > 0 ? Math.max(3, addedWidth) : 0}%` }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${m.spent > 0 ? Math.max(3, spentWidth) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
