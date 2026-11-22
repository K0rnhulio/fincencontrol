import React from 'react';
import { PieChart, BarChart3 } from 'lucide-react';
import { SummaryStats } from '../types';
import { formatVND } from '../utils/format';

interface ChartsSectionProps {
  summary: SummaryStats;
  onSelectCategory?: (category: string) => void;
}

const CATEGORY_COLORS = [
  'bg-emerald-400',
  'bg-sky-400',
  'bg-amber-400',
  'bg-violet-400',
  'bg-rose-400',
  'bg-cyan-400',
  'bg-pink-400',
  'bg-indigo-400',
];

export const ChartsSection: React.FC<ChartsSectionProps> = ({ summary, onSelectCategory }) => {
  const maxMonthValue = Math.max(
    1,
    ...summary.byMonth.flatMap((m) => [m.added, m.spent])
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Spending by Category */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Spending by Category</h2>
          </div>
          <span className="text-xs text-slate-500">Click to filter</span>
        </div>

        {summary.byCategory.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No expenses recorded yet. Upload a bank slip to see category breakdown.
          </div>
        ) : (
          <div className="space-y-3">
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
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-200 font-medium group-hover:text-emerald-300 transition">
                      {item.category}{' '}
                      <span className="text-slate-500 font-normal">({item.count})</span>
                    </span>
                    <span className="font-mono-num text-slate-300">
                      {formatVND(item.total)}{' '}
                      <span className="text-slate-500">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.max(3, pct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Cashflow */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Monthly Cashflow</h2>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
              Added
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" />
              Spent
            </span>
          </div>
        </div>

        {summary.byMonth.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            Cashflow history will appear once you add transactions.
          </div>
        ) : (
          <div className="space-y-3">
            {summary.byMonth.map((m) => {
              const addedWidth = Math.round((m.added / maxMonthValue) * 100);
              const spentWidth = Math.round((m.spent / maxMonthValue) * 100);
              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-num text-slate-300 font-medium">{m.month}</span>
                    <div className="flex items-center gap-3 font-mono-num text-[11px]">
                      <span className="text-emerald-400">+{formatVND(m.added)}</span>
                      <span className="text-rose-400">-{formatVND(m.spent)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${m.added > 0 ? Math.max(2, addedWidth) : 0}%` }}
                      />
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-400 transition-all duration-500"
                        style={{ width: `${m.spent > 0 ? Math.max(2, spentWidth) : 0}%` }}
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
