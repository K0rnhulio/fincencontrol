import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';
import { DEFAULT_CATEGORIES, OcrResult, TransactionType } from '../types';
import { formatVndInput, parseVndInput } from '../utils/format';

interface UploadSlipModalProps {
  initialFile?: File | null;
  onClose: () => void;
  onSaved: () => void;
  existingCategories: string[];
}

export const UploadSlipModal: React.FC<UploadSlipModalProps> = ({
  initialFile,
  onClose,
  onSaved,
  existingCategories,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [slipImagePath, setSlipImagePath] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [rawText, setRawText] = useState<string | null>(null);
  const [showBankDetails, setShowBankDetails] = useState(false);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState('Operations');
  const [recipient, setRecipient] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [slipMessage, setSlipMessage] = useState('');
  const [transactionDate, setTransactionDate] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [transactionRef, setTransactionRef] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const purposeInputRef = useRef<HTMLInputElement>(null);

  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existingCategories])
  ).filter((c) => c !== 'Top-up');

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a photo or screenshot.');
      return;
    }
    setError('');
    setPreviewUrl(URL.createObjectURL(file));
    setOcrLoading(true);
    setOcrDone(false);

    try {
      const formData = new FormData();
      formData.append('slip', file);
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = (await res.json()) as { slipImagePath: string; ocr: OcrResult };
      setSlipImagePath(data.slipImagePath);
      setRawText(data.ocr.rawText || null);

      if (data.ocr.amount) {
        setAmountInput(formatVndInput(String(data.ocr.amount)));
      }
      if (data.ocr.recipient) setRecipient(data.ocr.recipient);
      if (data.ocr.bankName) setBankName(data.ocr.bankName);
      if (data.ocr.accountNumber) setAccountNumber(data.ocr.accountNumber);
      if (data.ocr.slipMessage) {
        setSlipMessage(data.ocr.slipMessage);
        if (!purpose) {
          setPurpose(data.ocr.slipMessage);
        }
      }
      if (data.ocr.transactionDate) setTransactionDate(data.ocr.transactionDate);
      if (data.ocr.transactionRef) setTransactionRef(data.ocr.transactionRef);

      setOcrDone(true);
      setTimeout(() => purposeInputRef.current?.focus(), 100);
    } catch {
      setError('Could not read the slip automatically — you can still type the amount below.');
    } finally {
      setOcrLoading(false);
    }
  };

  useEffect(() => {
    if (initialFile) {
      processFile(initialFile);
    }
  }, [initialFile]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseVndInput(amountInput);
    if (amount <= 0) {
      setError('Please enter how much was paid (in VND).');
      return;
    }
    if (!purpose.trim()) {
      setError('Please write what this payment was for.');
      purposeInputRef.current?.focus();
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount,
          purpose: purpose.trim(),
          category: type === 'topup' ? 'Top-up' : category,
          recipient: recipient.trim(),
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          slip_message: slipMessage.trim(),
          transaction_date: transactionDate,
          transaction_ref: transactionRef.trim(),
          slip_image_path: slipImagePath,
          ocr_raw_text: rawText,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Could not save');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Save Bank Slip</h2>
              <p className="text-xs text-slate-500">
                Check the amount &amp; write what it was for
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1">
          {/* Left: Slip Preview */}
          <div className="md:col-span-5 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/70 flex flex-col">
            {!previewUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 min-h-[220px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-300 hover:border-teal-400 bg-white'
                }`}
              >
                <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Tap to choose bank slip photo
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  We will read the amount &amp; date for you
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white flex-1 flex items-center justify-center max-h-[260px] sm:max-h-[380px]">
                  <img
                    src={previewUrl}
                    alt="Bank slip preview"
                    className="max-h-[260px] sm:max-h-[380px] w-auto object-contain"
                  />
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5">
                      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                      <span className="text-sm font-semibold text-slate-700">
                        Reading your bank slip...
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Choose another photo
                  </button>
                  {ocrDone && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Slip read!
                    </span>
                  )}
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
            />
          </div>

          {/* Right: Simple Form Fields */}
          <div className="md:col-span-7 p-5 sm:p-6 space-y-4">
            {/* Purpose first or Amount first */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Money In or Out?
                </label>
                <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                      type === 'expense'
                        ? 'bg-white text-rose-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Paid Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('topup')}
                    className={`py-2.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                      type === 'topup'
                        ? 'bg-white text-emerald-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Added In
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Amount (VND) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => setAmountInput(formatVndInput(e.target.value))}
                    placeholder="8.500.000"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-14 text-base font-mono-num font-bold text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    VND
                  </span>
                </div>
              </div>
            </div>

            {/* Purpose (What it was done for) */}
            <div>
              <label className="block text-xs font-semibold text-teal-700 mb-1.5">
                What did you pay for? *
              </label>
              <input
                ref={purposeInputRef}
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Box for frame, Shipping, Office snacks..."
                className="w-full rounded-2xl border-2 border-teal-200 bg-teal-50/30 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            {/* Category & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {type === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={type === 'topup' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Collapsible Bank Details */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowBankDetails((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer py-1"
              >
                {showBankDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showBankDetails ? 'Hide extra bank details' : 'Show extra bank details'}
                {recipient && !showBankDetails && (
                  <span className="text-slate-400 font-normal">({recipient})</span>
                )}
              </button>

              {showBankDetails && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Paid To (Recipient)
                      </label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="TA KIEU HUNG"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="TECHCOMBANK"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="9013 7319 85"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono-num text-slate-800 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Reference Code
                      </label>
                      <input
                        type="text"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="FT26324561596086"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono-num text-slate-800 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Message on Bank Slip
                    </label>
                    <input
                      type="text"
                      value={slipMessage}
                      onChange={(e) => setSlipMessage(e.target.value)}
                      placeholder="box for frame"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
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
                disabled={saving || ocrLoading}
                className="flex-1 sm:flex-none rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
