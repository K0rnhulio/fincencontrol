import React from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Download,
  FilterX,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatDateTime, formatVND } from '../utils/format';

export interface TableFilters {
  search: string;
  type: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: string[];
  filters: TableFilters;
  onFiltersChange: (next: TableFilters) => void;
  onSelectTransaction: (tx: Transaction) => void;
  loading: boolean;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  categories,
  filters,
  onFiltersChange,
  onSelectTransaction,
  loading,
}) => {
  const toggleSort = (col: string) => {
    if (filters.sortBy === col) {
      onFiltersChange({
        ...filters,
        sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onFiltersChange({
        ...filters,
        sortBy: col,
        sortDir: 'desc',
      });
    }
  };

  const renderSortIcon = (col: string) => {
    if (filters.sortBy !== col) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />;
    }
    return filters.sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
    );
  };

  const hasActiveFilters =
    filters.search ||
    filters.type !== 'ALL' ||
    filters.category !== 'ALL' ||
    filters.dateFrom ||
    filters.dateTo;

  const exportCsvUrl = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type !== 'ALL') params.set('type', filters.type);
    if (filters.category !== 'ALL') params.set('category', filters.category);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    params.set('sortBy', filters.sortBy);
    params.set('sortDir', filters.sortDir);
    return `/api/export/csv?${params.toString()}`;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
      {/* Filter & Search Toolbar */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              placeholder="Search purpose, recipient, slip message, ref..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Type filter */}
            <select
              value={filters.type}
              onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
              className="rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="expense">Spent Only</option>
              <option value="topup">Added Only</option>
            </select>

            {/* Category filter */}
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
              className="rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Mobile Sort selector */}
            <select
              value={`${filters.sortBy}:${filters.sortDir}`}
              onChange={(e) => {
                const [sortBy, sortDir] = e.target.value.split(':');
                onFiltersChange({
                  ...filters,
                  sortBy,
                  sortDir: sortDir === 'asc' ? 'asc' : 'desc',
                });
              }}
              className="md:hidden col-span-2 rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="date:desc">Sort: Newest First</option>
              <option value="date:asc">Sort: Oldest First</option>
              <option value="amount:desc">Sort: Highest Amount</option>
              <option value="amount:asc">Sort: Lowest Amount</option>
              <option value="purpose:asc">Sort: Purpose (A–Z)</option>
            </select>

            {/* Date range */}
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              title="From date"
              className="rounded-xl border border-slate-700/80 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
            <span className="hidden sm:inline text-slate-600 text-xs">to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              title="To date"
              className="rounded-xl border border-slate-700/80 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  onFiltersChange({
                    search: '',
                    type: 'ALL',
                    category: 'ALL',
                    dateFrom: '',
                    dateTo: '',
                    sortBy: filters.sortBy,
                    sortDir: filters.sortDir,
                  })
                }
                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            <a
              href={exportCsvUrl()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              CSV
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-slate-800/70">
        {loading && transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-slate-500">
            No transactions match your filters. Tap <strong>Upload Slip</strong> or{' '}
            <strong>Add Funds</strong> below.
          </div>
        ) : (
          transactions.map((tx) => (
            <button
              key={tx.id}
              type="button"
              onClick={() => onSelectTransaction(tx)}
              className="w-full text-left p-4 hover:bg-slate-800/40 active:bg-slate-800/60 transition flex items-start justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'topup'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {tx.type === 'topup' ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">
                    {tx.purpose || '—'}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {tx.recipient || tx.bank_name || formatDateTime(tx.transaction_date)}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center rounded-md bg-slate-800 border border-slate-700/70 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      {tx.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono-num">
                      {formatDateTime(tx.transaction_date)}
                    </span>
                    {tx.slip_image_path && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-300">
                        <ImageIcon className="w-2.5 h-2.5" />
                        Slip
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`text-sm font-mono-num font-semibold whitespace-nowrap shrink-0 ${
                  tx.type === 'topup' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatVND(tx.amount, tx.type)}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => toggleSort('date')}
                  className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  Date {renderSortIcon('date')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => toggleSort('purpose')}
                  className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  What it was for {renderSortIcon('purpose')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => toggleSort('recipient')}
                  className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  Recipient / Bank {renderSortIcon('recipient')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => toggleSort('category')}
                  className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  Category {renderSortIcon('category')}
                </button>
              </th>
              <th className="py-3 px-4 text-center">Slip</th>
              <th className="py-3 px-4 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('amount')}
                  className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer ml-auto"
                >
                  Amount {renderSortIcon('amount')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No transactions match your filters. Click <strong>Upload Slip</strong> or{' '}
                  <strong>Add Funds</strong> to get started.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="hover:bg-slate-800/40 transition cursor-pointer group"
                >
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono-num">
                    {formatDateTime(tx.transaction_date)}
                  </td>
                  <td className="py-3.5 px-4 max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.type === 'topup'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {tx.type === 'topup' ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-100 truncate group-hover:text-emerald-300 transition">
                          {tx.purpose || '—'}
                        </p>
                        {tx.slip_message && tx.slip_message !== tx.purpose && (
                          <p className="text-[11px] text-slate-500 truncate">
                            Msg: {tx.slip_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-slate-200 font-medium">{tx.recipient || '—'}</p>
                    {(tx.bank_name || tx.transaction_ref) && (
                      <p className="text-[11px] text-slate-500 font-mono-num">
                        {[tx.bank_name, tx.transaction_ref].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-lg bg-slate-800 border border-slate-700/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {tx.slip_image_path ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/20 px-2 py-1 text-[11px] text-sky-300">
                        <ImageIcon className="w-3 h-3" />
                        Slip
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right whitespace-nowrap font-mono-num font-semibold text-sm ${
                      tx.type === 'topup' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatVND(tx.amount, tx.type)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
