import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, PlusCircle, Wallet, LogOut, RotateCcw, AlertTriangle, X } from 'lucide-react';
import { SummaryStats, Transaction } from './types';
import { LoginGate } from './components/LoginGate';
import { OverviewCards } from './components/OverviewCards';
import { ChartsSection } from './components/ChartsSection';
import { TableFilters, TransactionsTable } from './components/TransactionsTable';
import { UploadSlipModal } from './components/UploadSlipModal';
import { AddTopupModal } from './components/AddTopupModal';
import { SlipViewerModal } from './components/SlipViewerModal';

const EMPTY_SUMMARY: SummaryStats = {
  balance: 0,
  totalAdded: 0,
  totalSpent: 0,
  totalCount: 0,
  topupCount: 0,
  expenseCount: 0,
  byCategory: [],
  byMonth: [],
  categories: [],
};

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const [summary, setSummary] = useState<SummaryStats>(EMPTY_SUMMARY);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    type: 'ALL',
    category: 'ALL',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortDir: 'desc',
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [initialSlipFile, setInitialSlipFile] = useState<File | null>(null);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const directSlipInputRef = useRef<HTMLInputElement>(null);

  const handleDirectSlipPick = () => {
    directSlipInputRef.current?.click();
  };

  const handleDirectSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInitialSlipFile(file);
      setShowUploadModal(true);
    }
    e.target.value = '';
  };

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = (await res.json()) as { required: boolean; authenticated: boolean };
      setAuthRequired(data.required);
      setAuthenticated(data.authenticated);
    } catch {
      setAuthenticated(true);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchData = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.type !== 'ALL') params.set('type', filters.type);
      if (filters.category !== 'ALL') params.set('category', filters.category);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      params.set('sortBy', filters.sortBy);
      params.set('sortDir', filters.sortDir);

      const [sumRes, txRes] = await Promise.all([
        fetch('/api/summary'),
        fetch(`/api/transactions?${params.toString()}`),
      ]);

      if (sumRes.status === 401 || txRes.status === 401) {
        setAuthenticated(false);
        return;
      }

      const [sumData, txData] = await Promise.all([sumRes.json(), txRes.json()]);
      setSummary(sumData);
      setTransactions(txData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [authenticated, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
  };

  const handleResetAll = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        setShowResetModal(false);
        fetchData();
      }
    } finally {
      setResetting(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">
        Opening your card tracker...
      </div>
    );
  }

  if (authRequired && !authenticated) {
    return <LoginGate onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-teal-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
                My Debit Card
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track money added &amp; bank slips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowTopupModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Money</span>
            </button>

            <button
              type="button"
              onClick={handleDirectSlipPick}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Add Bank Slip</span>
            </button>

            {summary.totalCount > 0 && (
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                title="Reset all data to 0"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {authRequired && (
              <button
                type="button"
                onClick={handleLogout}
                title="Lock"
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-8 space-y-4 sm:space-y-6">
        <OverviewCards summary={summary} />

        <ChartsSection
          summary={summary}
          onSelectCategory={(category) =>
            setFilters((prev) => ({
              ...prev,
              type: 'expense',
              category: prev.category === category ? 'ALL' : category,
            }))
          }
        />

        <TransactionsTable
          transactions={transactions}
          categories={summary.categories}
          filters={filters}
          onFiltersChange={setFilters}
          onSelectTransaction={(tx) => setSelectedTx(tx)}
          loading={loading}
        />
      </main>

      {/* Hidden direct image picker */}
      <input
        ref={directSlipInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleDirectSlipChange}
      />

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setShowTopupModal(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 active:bg-emerald-100 py-3.5 text-sm font-semibold text-emerald-700 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Money</span>
          </button>

          <button
            type="button"
            onClick={handleDirectSlipPick}
            className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 active:bg-teal-700 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Add Bank Slip</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && (
        <UploadSlipModal
          initialFile={initialSlipFile}
          onClose={() => {
            setShowUploadModal(false);
            setInitialSlipFile(null);
          }}
          onSaved={fetchData}
          existingCategories={summary.categories}
        />
      )}

      {showTopupModal && (
        <AddTopupModal
          onClose={() => setShowTopupModal(false)}
          onSaved={fetchData}
        />
      )}

      {selectedTx && (
        <SlipViewerModal
          transaction={selectedTx}
          existingCategories={summary.categories}
          onClose={() => setSelectedTx(null)}
          onUpdated={fetchData}
        />
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-base font-bold text-slate-900">Reset everything to 0 ₫?</h3>
            <p className="text-sm text-slate-500 mt-1.5">
              This will permanently delete all {summary.totalCount} saved items and bank slip
              photos so you can start fresh.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                disabled={resetting}
                className="rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition cursor-pointer"
              >
                {resetting ? 'Resetting...' : 'Yes, Reset to 0'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
