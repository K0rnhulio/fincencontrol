import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
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
  const [ocrEngine, setOcrEngine] = useState<string>('');
  const [rawText, setRawText] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

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
      setError('Please upload an image file (JPG, PNG, WEBP).');
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
      if (!res.ok) throw new Error('OCR upload failed');
      const data = (await res.json()) as { slipImagePath: string; ocr: OcrResult };
      setSlipImagePath(data.slipImagePath);
      setOcrEngine(data.ocr.engine);
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
    } catch (err) {
      setError('Failed to scan bank slip. You can still enter the details manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  // If opened with an initialFile from the direct image picker, scan it immediately
  useEffect(() => {
    if (initialFile) {
      processFile(initialFile);
    }
  }, [initialFile]);

  // Allow Ctrl+V / Cmd+V paste of screenshot anywhere while modal is open
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
      setError('Please enter a valid VND amount.');
      return;
    }
    if (!purpose.trim()) {
      setError('Please write what this payment was done for.');
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
        throw new Error(d.error || 'Failed to save transaction');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Upload Bank Slip</h2>
              <p className="text-xs text-slate-400">
                Drop or paste (Ctrl+V) a screenshot — OCR auto-fills amount, recipient &amp; date
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1">
          {/* Left: Slip Dropzone / Preview */}
          <div className="md:col-span-5 p-5 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/50 flex flex-col">
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
                className={`flex-1 min-h-[280px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/40'
                }`}
              >
                <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-emerald-400 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  Drop bank slip screenshot here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  or click to browse, or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Ctrl+V</kbd> to paste
                </p>
                <p className="text-[11px] text-slate-600 mt-4">
                  Supports Techcombank, Vietcombank, MB, ACB, BIDV, TPBank, Momo...
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex-1 flex items-center justify-center max-h-[380px]">
                  <img
                    src={previewUrl}
                    alt="Bank slip preview"
                    className="max-h-[380px] w-auto object-contain"
                  />
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                      <span className="text-xs font-medium text-emerald-300">
                        Scanning bank slip with OCR...
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Replace image
                  </button>
                  {ocrDone && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      OCR complete ({ocrEngine})
                    </span>
                  )}
                </div>

                {rawText && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowRawText((v) => !v)}
                      className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      {showRawText ? 'Hide raw OCR text' : 'View raw OCR text'}
                    </button>
                    {showRawText && (
                      <pre className="mt-1.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 max-h-28 overflow-auto whitespace-pre-wrap">
                        {rawText}
                      </pre>
                    )}
                  </div>
                )}
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

          {/* Right: Form Fields */}
          <div className="md:col-span-7 p-6 space-y-4">
            {/* Type & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                      type === 'expense'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Spent
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('topup')}
                    className={`py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                      type === 'topup'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Added
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Amount (VND) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => setAmountInput(formatVndInput(e.target.value))}
                    placeholder="8.500.000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 pr-12 text-sm font-mono-num font-semibold text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                    VND
                  </span>
                </div>
              </div>
            </div>

            {/* Purpose (What it was done for) */}
            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1.5">
                What was this done for? (Purpose / Note) *
              </label>
              <input
                ref={purposeInputRef}
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Box for frame packaging, Facebook Ads, Office supplies..."
                className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Category & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {type === 'expense' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
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
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Extracted Bank Details */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Bank Slip Details (Auto-filled by OCR)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Recipient</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="TA KIEU HUNG"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="TECHCOMBANK"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Account No.</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="9013 7319 85"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-mono-num text-slate-200 placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Transaction Ref</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="FT26324561596086"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-mono-num text-slate-200 placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Slip Transfer Message (Lời nhắn)
                </label>
                <input
                  type="text"
                  value={slipMessage}
                  onChange={(e) => setSlipMessage(e.target.value)}
                  placeholder="box for frame"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                />
              </div>
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
                disabled={saving || ocrLoading}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-5 py-2 text-xs font-semibold text-slate-950 transition cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
