export type TransactionType = 'topup' | 'expense';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number; // Integer VND
  purpose: string; // What it was done for (user-written)
  category: string;
  recipient: string;
  bank_name: string;
  account_number: string;
  slip_message: string;
  transaction_ref: string;
  transaction_date: string; // ISO string or YYYY-MM-DDTHH:mm
  slip_image_path: string | null;
  ocr_raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  purpose: string;
  category?: string;
  recipient?: string;
  bank_name?: string;
  account_number?: string;
  slip_message?: string;
  transaction_ref?: string;
  transaction_date?: string;
  slip_image_path?: string | null;
  ocr_raw_text?: string | null;
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
