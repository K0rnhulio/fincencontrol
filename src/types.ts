export type TransactionType = 'topup' | 'expense';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  purpose: string;
  category: string;
  recipient: string;
  bank_name: string;
  account_number: string;
  slip_message: string;
  transaction_ref: string;
  transaction_date: string;
  slip_image_path: string | null;
  ocr_raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface SummaryStats {
  balance: number;
  totalAdded: number;
  totalSpent: number;
  totalCount: number;
  topupCount: number;
  expenseCount: number;
  byCategory: { category: string; total: number; count: number }[];
  byMonth: { month: string; added: number; spent: number }[];
  categories: string[];
}

export interface OcrResult {
  amount: number | null;
  recipient: string;
  bankName: string;
  accountNumber: string;
  slipMessage: string;
  transactionDate: string;
  transactionRef: string;
  rawText: string;
  engine: 'tesseract' | 'gemini' | 'openai';
}

export const DEFAULT_CATEGORIES = [
  'Operations',
  'Materials & Packaging',
  'Shipping & Logistics',
  'Marketing & Ads',
  'Software & Tools',
  'Equipment',
  'Salary & Contractors',
  'Rent & Utilities',
  'Food & Travel',
  'General',
];
