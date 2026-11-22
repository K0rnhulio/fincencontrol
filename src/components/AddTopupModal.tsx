import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { formatVndInput, parseVndInput } from '../utils/format';

interface AddTopupModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const QUICK_AMOUNTS = [10_000_000, 20_000_000, 50_000_000, 100_000_000];

export const AddTopupModal: React.FC<AddTopupModalProps> = ({ onClose, onSaved }) => {
  const [amountInput, setAmountInput] = useState('100.000.000');
  const [purpose, setPurpose] = useState('Added money to card');
  const [transactionDate, setTransactionDate] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseVndInput(amountInput);
    if (amount <= 0) {
      setError('Please enter how much money was added.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'topup',
          amount,
          purpose: purpose.trim() || 'Added money to card',
          category: 'Top-up',
          transaction_date: transactionDate,
        }),
      });
      if (!res.ok) throw new Error('Failed to add money');
      onSaved();
      onClose();
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Money to Card</h2>
              <p className="text-xs text-slate-500">Record VND added to your debit card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              How much was added? (VND) *
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(formatVndInput(e.target.value))}
                placeholder="100.000.000"
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-14 text-lg font-mono-num font-bold text-emerald-600 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                VND
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2.5">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountInput(formatVndInput(String(amt)))}
                  className="py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 text-xs font-mono-num font-semibold text-emerald-700 transition cursor-pointer"
                >
                  +{(amt / 1_000_000).toFixed(0)}M
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Monthly budget, Owner transfer..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              {saving ? 'Adding...' : 'Add Money'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
