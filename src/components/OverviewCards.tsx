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
      {/* Money Left on Card — Debit Card Hero */}
      <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-600 to-sky-600 p-5 text-white shadow-lg shadow-teal-600/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-100">
            Money Left on Card
          </span>
          <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center text-white">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div
          className={`text-2xl sm:text-3xl font-bold font-mono-num tracking-tight ${
            summary.balance < 0 ? 'text-rose-200' : 'text-white'
          }`}
        >
          {formatVND(summary.balance)}
        </div>
        <div className="mt-4 flex items-center gap-2.5">
          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spentPct > 90 ? 'bg-rose-300' : spentPct > 70 ? 'bg-amber-300' : 'bg-white'
              }`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
          <span className="text-xs font-medium text-teal-50 font-mono-num">
            {spentPct}% spent
          </span>
        </div>
      </div>

      {/* Money Added */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-xs font-semibold text-slate-500">Money Added</span>
          <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-2xl font-bold font-mono-num text-emerald-600 truncate">
          {formatVND(summary.totalAdded)}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {summary.topupCount} {summary.topupCount === 1 ? 'top-up' : 'top-ups'}
        </p>
      </div>

      {/* Money Spent */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-xs font-semibold text-slate-500">Money Spent</span>
          <div className="h-8 w-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-2xl font-bold font-mono-num text-rose-600 truncate">
          {formatVND(summary.totalSpent)}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {summary.expenseCount} {summary.expenseCount === 1 ? 'payment' : 'payments'}
        </p>
      </div>

      {/* Average Payment */}
      <div className="col-span-2 lg:col-span-1 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-xs font-semibold text-slate-500">Average Payment</span>
          <div className="h-8 w-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono-num text-slate-800">
          {summary.expenseCount > 0
            ? formatVND(Math.round(summary.totalSpent / summary.expenseCount))
            : '0 ₫'}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {summary.totalCount} total {summary.totalCount === 1 ? 'item' : 'items'} saved
        </p>
      </div>
    </div>
  );
};
