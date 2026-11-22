import React from 'react';
import { CreditCard, ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { SummaryStats } from '../types';
import { formatVND } from '../utils/format';

interface OverviewCardsProps {
  summary: SummaryStats;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ summary }) => {
  const spentPct =
    summary.totalAdded > 0
      ? Math.min(100, Math.round((summary.totalSpent / summary.totalAdded) * 100))
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Current Debit Card Balance */}
      <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-300/80">
            Debit Card Balance
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div
          className={`text-2xl font-bold font-mono-num tracking-tight ${
            summary.balance < 0 ? 'text-rose-400' : 'text-white'
          }`}
        >
          {formatVND(summary.balance)}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spentPct > 90 ? 'bg-rose-500' : spentPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 font-mono-num">{spentPct}% used</span>
        </div>
      </div>

      {/* Total Added */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-400">
            Total Added
          </span>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-2xl font-bold font-mono-num text-emerald-400 truncate">
          {formatVND(summary.totalAdded)}
        </div>
        <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500">
          {summary.topupCount} {summary.topupCount === 1 ? 'top-up' : 'top-ups'}
        </p>
      </div>

      {/* Total Spent */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-400">
            Total Spent
          </span>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-2xl font-bold font-mono-num text-rose-400 truncate">
          {formatVND(summary.totalSpent)}
        </div>
        <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500">
          {summary.expenseCount} {summary.expenseCount === 1 ? 'payment' : 'payments'}
        </p>
      </div>

      {/* Average Spend */}
      <div className="col-span-2 lg:col-span-1 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Avg. Payment
          </span>
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono-num text-slate-100">
          {summary.expenseCount > 0
            ? formatVND(Math.round(summary.totalSpent / summary.expenseCount))
            : '0 ₫'}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {summary.totalCount} total ledger entries
        </p>
      </div>
    </div>
  );
};
