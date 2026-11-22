import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  UPLOADS_DIR,
  createTransaction,
  deleteTransaction,
  getSummaryStats,
  getTransactionById,
  listTransactions,
  updateTransaction,
} from './db';
import { runSlipOcr } from './ocr';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.createHash('sha256').update(APP_PASSWORD || 'fincontrol-dev').digest('hex');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Multer storage for uploaded bank slips
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

function signToken(payload: string): string {
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!APP_PASSWORD) return next();
  const token = req.cookies?.fc_session;
  if (verifyToken(token)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Healthcheck for Coolify
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.get('/api/auth/status', (req, res) => {
  const required = Boolean(APP_PASSWORD);
  const authenticated = !required || verifyToken(req.cookies?.fc_session);
  res.json({ required, authenticated });
});

app.post('/api/auth/login', (req, res) => {
  if (!APP_PASSWORD) {
    return res.json({ ok: true });
  }
  const { password } = req.body as { password?: string };
  if (password === APP_PASSWORD) {
    const token = signToken(`admin:${Date.now()}`);
    res.cookie('fc_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('fc_session');
  res.json({ ok: true });
});

// Serve uploaded bank slip images (protected if APP_PASSWORD is set)
app.use('/uploads', requireAuth, express.static(UPLOADS_DIR));

// Summary & overview stats
app.get('/api/summary', requireAuth, (_req, res) => {
  try {
    const summary = getSummaryStats();
    res.json(summary);
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// List transactions with filtering & sorting
app.get('/api/transactions', requireAuth, (req, res) => {
  try {
    const { search, type, category, dateFrom, dateTo, sortBy, sortDir } = req.query as Record<
      string,
      string | undefined
    >;
    const rows = listTransactions({
      search,
      type,
      category,
      dateFrom,
      dateTo,
      sortBy,
      sortDir: sortDir === 'asc' ? 'asc' : 'desc',
    });
    res.json(rows);
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

// Upload slip & run OCR
app.post('/api/ocr', requireAuth, upload.single('slip'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No slip image uploaded' });
  }

  const slipImagePath = `/uploads/${req.file.filename}`;
  try {
    const ocr = await runSlipOcr(req.file.path);
    res.json({ slipImagePath, ocr });
  } catch (err) {
    console.error('OCR error:', err);
    res.json({
      slipImagePath,
      ocr: {
        amount: null,
        recipient: '',
        bankName: '',
        accountNumber: '',
        slipMessage: '',
        transactionDate: new Date().toISOString().slice(0, 16),
        transactionRef: '',
        rawText: '',
        engine: 'tesseract',
      },
    });
  }
});

// Create transaction
app.post('/api/transactions', requireAuth, (req, res) => {
  try {
    const body = req.body;
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (body.type !== 'topup' && body.type !== 'expense') {
      return res.status(400).json({ error: 'Type must be topup or expense' });
    }

    const tx = createTransaction({
      type: body.type,
      amount,
      purpose: body.purpose || '',
      category: body.category || (body.type === 'topup' ? 'Top-up' : 'General'),
      recipient: body.recipient || '',
      bank_name: body.bank_name || '',
      account_number: body.account_number || '',
      slip_message: body.slip_message || '',
      transaction_ref: body.transaction_ref || '',
      transaction_date: body.transaction_date || new Date().toISOString().slice(0, 16),
      slip_image_path: body.slip_image_path || null,
      ocr_raw_text: body.ocr_raw_text || null,
    });

    res.status(201).json(tx);
  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction
app.patch('/api/transactions/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });

  const existing = getTransactionById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated = updateTransaction(id, req.body);
  res.json(updated);
});

// Delete transaction
app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });

  const ok = deleteTransaction(id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// Export CSV
app.get('/api/export/csv', requireAuth, (req, res) => {
  const { search, type, category, dateFrom, dateTo, sortBy, sortDir } = req.query as Record<
    string,
    string | undefined
  >;
  const rows = listTransactions({
    search,
    type,
    category,
    dateFrom,
    dateTo,
    sortBy,
    sortDir: sortDir === 'asc' ? 'asc' : 'desc',
  });

  const escapeCsv = (val: string | number | null | undefined) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'ID',
    'Date',
    'Type',
    'Amount (VND)',
    'Purpose',
    'Category',
    'Recipient',
    'Bank',
    'Account',
    'Slip Message',
    'Transaction Ref',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.id,
        r.transaction_date,
        r.type === 'topup' ? 'Added' : 'Spent',
        r.amount,
        r.purpose,
        r.category,
        r.recipient,
        r.bank_name,
        r.account_number,
        r.slip_message,
        r.transaction_ref,
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fincontrol-transactions.csv"');
  res.send('\uFEFF' + lines.join('\n'));
});

// Serve built frontend in production
const clientDist = path.resolve(process.cwd(), 'dist', 'client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FinControl server running on http://0.0.0.0:${PORT}`);
});
