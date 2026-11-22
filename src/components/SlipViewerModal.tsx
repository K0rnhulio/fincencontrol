import React, { useState } from 'react';
import { X, Trash2, Save, ExternalLink, Receipt } from 'lucide-react';
import { DEFAULT_CATEGORIES, Transaction } from '../types';
import { formatVndInput, parseVndInput } from '../utils/format';

interface SlipViewerModalProps {
  transaction: Transaction;
  existingCategories: string[];
  onClose: () => void;
  onUpdated: () => void;
}

export const SlipViewerModal: React.FC<SlipViewerModalProps> = ({
  transaction,
  existingCategories,
  onClose,
  onUpdated,
}) => {
  const [amountInput, setAmountInput] = useState(() =>
    formatVndInput(String(transaction.amount))
  );
  const [purpose, setPurpose] = useState(transaction.purpose);
  const [category, setCategory] = useState(transaction.category);
  const [recipient, setRecipient] = useState(transaction.recipient);
  const [bankName, setBankName] = useState(transaction.bank_name);
  const [accountNumber, setAccountNumber] = useState(transaction.account_number);
  const [slipMessage, setSlipMessage] = useState(transaction.slip_message);
  const [transactionDate, setTransactionDate] = useState(transaction.transaction_date);
  const [transactionRef, setTransactionRef] = useState(transaction.transaction_ref);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existingCategories, transaction.category])
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseVndInput(amountInput);
    if (amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          purpose,
          category,
          recipient,
          bank_name: bankName,
          account_number: accountNumber,
          slip_message: slipMessage,
          transaction_date: transactionDate,
          transaction_ref: transactionRef,
        }),
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {transaction.type === 'topup' ? 'Money Added' : 'Payment Details'}
              </h2>
              <p className="text-xs text-slate-500">View photo or edit details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1">
          {/* Left: Slip Image */}
          <div className="md:col-span-5 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/70 flex flex-col items-center justify-center">
            {transaction.slip_image_path ? (
              <div className="w-full flex flex-col items-center">
                <img
                  src={transaction.slip_image_path}
                  alt="Paid bank slip"
                  className="max-h-[260px] sm:max-h-[400px] w-auto rounded-2xl border border-slate-200 object-contain bg-white"
                />
                <a
                  href={transaction.slip_image_path}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  View full photo <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No bank slip photo attached.
              </div>
            )}
          </div>

          {/* Right: Editable Fields */}
          <div className="md:col-span-7 p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Amount (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => setAmountInput(formatVndInput(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-base font-mono-num font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none"
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                What it was for
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Paid To
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Bank</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Account</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono-num text-slate-700 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Ref Code</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono-num text-slate-700 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Message on Slip
              </label>
              <input
                type="text"
                value={slipMessage}
                onChange={(e) => setSlipMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
