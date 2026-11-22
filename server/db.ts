import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CreateTransactionInput, Transaction } from './types';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'finance.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('topup', 'expense')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    purpose TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General',
    recipient TEXT NOT NULL DEFAULT '',
    bank_name TEXT NOT NULL DEFAULT '',
    account_number TEXT NOT NULL DEFAULT '',
    slip_message TEXT NOT NULL DEFAULT '',
    transaction_ref TEXT NOT NULL DEFAULT '',
    transaction_date TEXT NOT NULL,
    slip_image_path TEXT,
    ocr_raw_text TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
`);

export { DATA_DIR, UPLOADS_DIR };

export interface TransactionFilters {
  search?: string;
  type?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  date: 'transaction_date',
  amount: 'amount',
  type: 'type',
  category: 'category',
  purpose: 'purpose',
  recipient: 'recipient',
  created: 'created_at',
};

export function listTransactions(filters: TransactionFilters = {}): Transaction[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.type && (filters.type === 'topup' || filters.type === 'expense')) {
    conditions.push('type = @type');
    params.type = filters.type;
  }

  if (filters.category && filters.category !== 'ALL') {
    conditions.push('category = @category');
    params.category = filters.category;
  }

  if (filters.dateFrom) {
    conditions.push('transaction_date >= @dateFrom');
    params.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo) {
    conditions.push('transaction_date <= @dateTo');
    params.dateTo = filters.dateTo + 'T23:59:59';
  }

  if (filters.search && filters.search.trim()) {
    conditions.push(
      `(purpose LIKE @q OR recipient LIKE @q OR slip_message LIKE @q OR transaction_ref LIKE @q OR bank_name LIKE @q OR category LIKE @q)`
    );
    params.q = `%${filters.search.trim()}%`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortCol = ALLOWED_SORT_COLUMNS[filters.sortBy || 'date'] || 'transaction_date';
  const sortDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC';

  const sql = `SELECT * FROM transactions ${whereClause} ORDER BY ${sortCol} ${sortDir}, id DESC`;
  return db.prepare(sql).all(params) as Transaction[];
}

export function getTransactionById(id: number): Transaction | undefined {
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
}

export function createTransaction(input: CreateTransactionInput): Transaction {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO transactions (
      type, amount, purpose, category, recipient, bank_name,
      account_number, slip_message, transaction_ref, transaction_date,
      slip_image_path, ocr_raw_text, created_at, updated_at
    ) VALUES (
      @type, @amount, @purpose, @category, @recipient, @bank_name,
      @account_number, @slip_message, @transaction_ref, @transaction_date,
      @slip_image_path, @ocr_raw_text, @created_at, @updated_at
    )
  `);

  const info = stmt.run({
    type: input.type,
    amount: Math.round(input.amount),
    purpose: (input.purpose || '').trim(),
    category: (input.category || (input.type === 'topup' ? 'Top-up' : 'General')).trim(),
    recipient: (input.recipient || '').trim(),
    bank_name: (input.bank_name || '').trim(),
    account_number: (input.account_number || '').trim(),
    slip_message: (input.slip_message || '').trim(),
    transaction_ref: (input.transaction_ref || '').trim(),
    transaction_date: input.transaction_date || now.slice(0, 16),
    slip_image_path: input.slip_image_path || null,
    ocr_raw_text: input.ocr_raw_text || null,
    created_at: now,
    updated_at: now,
  });

  return getTransactionById(Number(info.lastInsertRowid))!;
}

export function updateTransaction(id: number, input: Partial<CreateTransactionInput>): Transaction | undefined {
  const existing = getTransactionById(id);
  if (!existing) return undefined;

  const updated = {
    id,
    type: input.type ?? existing.type,
    amount: input.amount !== undefined ? Math.round(input.amount) : existing.amount,
    purpose: input.purpose !== undefined ? input.purpose.trim() : existing.purpose,
    category: input.category !== undefined ? input.category.trim() : existing.category,
    recipient: input.recipient !== undefined ? input.recipient.trim() : existing.recipient,
    bank_name: input.bank_name !== undefined ? input.bank_name.trim() : existing.bank_name,
    account_number: input.account_number !== undefined ? input.account_number.trim() : existing.account_number,
    slip_message: input.slip_message !== undefined ? input.slip_message.trim() : existing.slip_message,
    transaction_ref: input.transaction_ref !== undefined ? input.transaction_ref.trim() : existing.transaction_ref,
    transaction_date: input.transaction_date ?? existing.transaction_date,
    updated_at: new Date().toISOString(),
  };

  db.prepare(`
    UPDATE transactions SET
      type = @type,
      amount = @amount,
      purpose = @purpose,
      category = @category,
      recipient = @recipient,
      bank_name = @bank_name,
      account_number = @account_number,
      slip_message = @slip_message,
      transaction_ref = @transaction_ref,
      transaction_date = @transaction_date,
      updated_at = @updated_at
    WHERE id = @id
  `).run(updated);

  return getTransactionById(id);
}

export function deleteTransaction(id: number): boolean {
  const existing = getTransactionById(id);
  if (!existing) return false;

  if (existing.slip_image_path) {
    const filename = path.basename(existing.slip_image_path);
    const fullPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // ignore file deletion errors
      }
    }
  }

  const info = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return info.changes > 0;
}

export function getSummaryStats() {
  const totals = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'topup' THEN amount ELSE 0 END), 0) AS totalAdded,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalSpent,
        COUNT(*) AS totalCount,
        SUM(CASE WHEN type = 'topup' THEN 1 ELSE 0 END) AS topupCount,
        SUM(CASE WHEN type = 'expense' THEN 1 ELSE 0 END) AS expenseCount
      FROM transactions
    `
    )
    .get() as {
    totalAdded: number;
    totalSpent: number;
    totalCount: number;
    topupCount: number;
    expenseCount: number;
  };

  const byCategory = db
    .prepare(
      `
      SELECT category, SUM(amount) AS total, COUNT(*) AS count
      FROM transactions
      WHERE type = 'expense'
      GROUP BY category
      ORDER BY total DESC
    `
    )
    .all() as { category: string; total: number; count: number }[];

  const byMonth = db
    .prepare(
      `
      SELECT
        substr(transaction_date, 1, 7) AS month,
        SUM(CASE WHEN type = 'topup' THEN amount ELSE 0 END) AS added,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS spent
      FROM transactions
      GROUP BY substr(transaction_date, 1, 7)
      ORDER BY month ASC
      LIMIT 12
    `
    )
    .all() as { month: string; added: number; spent: number }[];

  const categories = db
    .prepare(`SELECT DISTINCT category FROM transactions ORDER BY category ASC`)
    .all() as { category: string }[];

  return {
    balance: totals.totalAdded - totals.totalSpent,
    totalAdded: totals.totalAdded,
    totalSpent: totals.totalSpent,
    totalCount: totals.totalCount,
    topupCount: totals.topupCount,
    expenseCount: totals.expenseCount,
    byCategory,
    byMonth,
    categories: categories.map((c) => c.category),
  };
}
