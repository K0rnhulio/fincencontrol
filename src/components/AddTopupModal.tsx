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
  const [purpose, setPurpose] = useState('Debit card top-up');
  const [transactionDate, setTransactionDate] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseVndInput(amountInput);
    if (amount <= 0) {
      setError('Please enter a valid VND amount.');
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
          purpose: purpose.trim() || 'Debit card top-up',
          category: 'Top-up',
          transaction_date: transactionDate,
        }),
      });
      if (!res.ok) throw new Error('Failed to add funds');
      onSaved();
      onClose();
    } catch {
      setError('Could not save top-up.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Add Funds to Debit Card</h2>
              <p className="text-xs text-slate-400">Record VND added to your card balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Amount Added (VND) *
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(formatVndInput(e.target.value))}
                placeholder="100.000.000"
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 pr-12 text-base font-mono-num font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                VND
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountInput(formatVndInput(String(amt)))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono-num text-slate-300 transition cursor-pointer"
                >
                  +{(amt / 1_000_000).toFixed(0)}M
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Source / Note
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Monthly budget transfer, Owner deposit..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-5 py-2 text-xs font-semibold text-slate-950 transition cursor-pointer"
            >
              {saving ? 'Adding...' : 'Add Funds'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
