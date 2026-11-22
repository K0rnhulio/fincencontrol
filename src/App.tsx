import React, { useState, useEffect, useCallback } from 'react';
import { Upload, PlusCircle, Wallet, LogOut } from 'lucide-react';
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
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500">
        Loading FinControl...
      </div>
    );
  }

  if (authRequired && !authenticated) {
    return <LoginGate onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-none">
                FinControl
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Debit Card &amp; Bank Slip Ledger (VND)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowTopupModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Funds</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Slip</span>
            </button>

            {authRequired && (
              <button
                type="button"
                onClick={handleLogout}
                title="Lock / Logout"
                className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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

      {/* Modals */}
      {showUploadModal && (
        <UploadSlipModal
          onClose={() => setShowUploadModal(false)}
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
    </div>
  );
}
