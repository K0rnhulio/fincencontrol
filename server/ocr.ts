import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { OcrResult } from './types';

const KNOWN_BANKS = [
  'TECHCOMBANK',
  'VIETCOMBANK',
  'MB BANK',
  'MBBANK',
  'BIDV',
  'VIETINBANK',
  'ACB',
  'VPBANK',
  'TPBANK',
  'SACOMBANK',
  'AGRIBANK',
  'HDBANK',
  'VIB',
  'MSB',
  'OCB',
  'SHB',
  'SEABANK',
  'EXIMBANK',
  'LPBANK',
  'NAM A BANK',
  'MOMO',
  'ZALOPAY',
];

function parseVndAmount(raw: string): number | null {
  // Remove spaces, currency symbols, keep digits and separators
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  // In VND there are no decimals; dots or commas are thousand separators
  // Except if someone has .00 at the very end, e.g. 8,500,000.00
  let normalized = cleaned;
  if (/^\d{1,3}([.,]\d{3})+(\.\d{2})?$/.test(cleaned)) {
    normalized = cleaned.replace(/\.\d{2}$/, '').replace(/[.,]/g, '');
  } else {
    normalized = cleaned.replace(/[.,]/g, '');
  }

  const num = parseInt(normalized, 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function parseVietnameseDate(text: string): string {
  // Format 1: "20 thg 11, 2026 lúc 20:58" or "20 thg 11 2026, 20:58"
  const thgMatch = text.match(
    /(\d{1,2})\s*(?:thg|tháng)\s*(\d{1,2})[,\s]+(\d{4})(?:[^\d]*(\d{1,2}):(\d{2}))?/i
  );
  if (thgMatch) {
    const day = thgMatch[1].padStart(2, '0');
    const month = thgMatch[2].padStart(2, '0');
    const year = thgMatch[3];
    const hour = (thgMatch[4] || '12').padStart(2, '0');
    const min = (thgMatch[5] || '00').padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${min}`;
  }

  // Format 2: "20/11/2026 20:58" or "20-11-2026 20:58:12" or "20:58 20/11/2026"
  const dmyTimeMatch = text.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[^\d]*(\d{1,2}):(\d{2}))?/
  );
  if (dmyTimeMatch) {
    const day = dmyTimeMatch[1].padStart(2, '0');
    const month = dmyTimeMatch[2].padStart(2, '0');
    const year = dmyTimeMatch[3];
    const hour = (dmyTimeMatch[4] || '12').padStart(2, '0');
    const min = (dmyTimeMatch[5] || '00').padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${min}`;
  }

  // Format 3: "20:58 - 20/11/2026"
  const timeDmyMatch = text.match(
    /(\d{1,2}):(\d{2})(?::\d{2})?[^\d]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
  );
  if (timeDmyMatch) {
    const hour = timeDmyMatch[1].padStart(2, '0');
    const min = timeDmyMatch[2].padStart(2, '0');
    const day = timeDmyMatch[3].padStart(2, '0');
    const month = timeDmyMatch[4].padStart(2, '0');
    const year = timeDmyMatch[5];
    return `${year}-${month}-${day}T${hour}:${min}`;
  }

  return new Date().toISOString().slice(0, 16);
}

export function parseBankSlipText(rawText: string): Omit<OcrResult, 'rawText' | 'engine'> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const fullText = lines.join('\n');

  // 1. Bank Name
  let bankName = '';
  const upperFull = fullText.toUpperCase();
  for (const bank of KNOWN_BANKS) {
    if (upperFull.includes(bank)) {
      bankName = bank;
      break;
    }
  }

  // 2. Amount
  let amount: number | null = null;
  const amountPatterns = [
    /(?:VND|VNĐ)\s*[:\-]?\s*([+-]?\s*[\d.,]{4,})/i,
    /([+-]?\s*[\d.,]{4,})\s*(?:VND|VNĐ|đ|d)\b/i,
    /(?:Số tiền|Amount)\s*[:\-]?\s*([+-]?\s*[\d.,]{4,})/i,
  ];
  for (const pat of amountPatterns) {
    const m = fullText.match(pat);
    if (m && m[1]) {
      const parsed = parseVndAmount(m[1]);
      if (parsed && parsed >= 1000) {
        amount = parsed;
        break;
      }
    }
  }

  // Fallback: look for any large formatted number like 8,500,000 or 8.500.000
  if (!amount) {
    const fallbackMatches = fullText.match(/\b\d{1,3}(?:[.,]\d{3})+\b/g);
    if (fallbackMatches) {
      for (const fm of fallbackMatches) {
        const parsed = parseVndAmount(fm);
        if (parsed && parsed >= 1000) {
          amount = parsed;
          break;
        }
      }
    }
  }

  // 3. Recipient
  let recipient = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const toiMatch = line.match(/^(?:Tới|Đến|Người nhận|Tên người nhận|Thụ hưởng|To)\s*[:\-]?\s*(.+)$/i);
    if (toiMatch && toiMatch[1]) {
      const candidate = toiMatch[1].trim();
      if (!/^(VND|VNĐ|\d)/i.test(candidate)) {
        recipient = candidate;
        break;
      }
    }
    if (/^(?:Người nhận|Tên người thụ hưởng|Tài khoản thụ hưởng|Người thụ hưởng)$/i.test(line) && lines[i + 1]) {
      recipient = lines[i + 1];
      break;
    }
  }

  // 4. Account number
  let accountNumber = '';
  const accIdx = lines.findIndex((l) =>
    /Tài khoản nhận|Số tài khoản|STK|Account/i.test(l)
  );
  if (accIdx !== -1) {
    for (let j = accIdx; j <= Math.min(accIdx + 3, lines.length - 1); j++) {
      const numMatch = lines[j].match(/\b(\d[\d\s]{5,20}\d)\b/);
      if (numMatch) {
        accountNumber = numMatch[1].trim();
        break;
      }
    }
  }

  // 5. Slip message / Lời nhắn / Nội dung
  let slipMessage = '';
  const msgIdx = lines.findIndex((l) =>
    /^(?:Lời nhắn|Nội dung|Nội dung chuyển khoản|Nội dung giao dịch|Diễn giải|Ghi chú|Message)/i.test(l)
  );
  if (msgIdx !== -1) {
    const sameLine = lines[msgIdx].replace(
      /^(?:Lời nhắn|Nội dung|Nội dung chuyển khoản|Nội dung giao dịch|Diễn giải|Ghi chú|Message)\s*[:\-]?\s*/i,
      ''
    ).trim();
    if (sameLine) {
      slipMessage = sameLine;
    } else if (lines[msgIdx + 1]) {
      const collected: string[] = [];
      for (let j = msgIdx + 1; j < Math.min(msgIdx + 4, lines.length); j++) {
        if (/^(?:Ngày thực hiện|Thời gian|Mã giao dịch|Số tham chiếu|Đây là)/i.test(lines[j])) {
          break;
        }
        collected.push(lines[j]);
      }
      slipMessage = collected.join(' ').trim();
    }
  }

  // 6. Transaction Date
  const dateIdx = lines.findIndex((l) =>
    /Ngày thực hiện|Thời gian|Ngày giao dịch|Date|Time/i.test(l)
  );
  let transactionDate = '';
  if (dateIdx !== -1) {
    const dateSlice = lines.slice(dateIdx, dateIdx + 3).join(' ');
    transactionDate = parseVietnameseDate(dateSlice);
  } else {
    transactionDate = parseVietnameseDate(fullText);
  }

  // 7. Transaction Ref / Mã giao dịch
  let transactionRef = '';
  const refIdx = lines.findIndex((l) =>
    /Mã giao dịch|Số tham chiếu|Mã tham chiếu|Reference|Trans ID/i.test(l)
  );
  if (refIdx !== -1) {
    const slice = lines.slice(refIdx, refIdx + 2).join(' ');
    const refMatch = slice.match(/\b([A-Z]{1,5}\d{6,}|\d{8,})\b/);
    if (refMatch) {
      transactionRef = refMatch[1];
    }
  }
  if (!transactionRef) {
    const ftMatch = fullText.match(/\b(FT\d{8,})\b/i);
    if (ftMatch) {
      transactionRef = ftMatch[1].toUpperCase();
    }
  }

  return {
    amount,
    recipient,
    bankName,
    accountNumber,
    slipMessage,
    transactionDate,
    transactionRef,
  };
}

async function ocrWithGemini(imagePath: string, apiKey: string): Promise<OcrResult | null> {
  try {
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const base64 = fs.readFileSync(imagePath).toString('base64');

    const prompt = `Extract the details from this Vietnamese bank transfer slip screenshot as strict JSON with these exact keys:
{
  "amount": number (integer in VND, e.g. 8500000),
  "recipient": string (recipient name),
  "bankName": string (bank name, e.g. "TECHCOMBANK"),
  "accountNumber": string (recipient account number),
  "slipMessage": string (transfer message / lời nhắn / nội dung),
  "transactionDate": string (ISO format "YYYY-MM-DDTHH:mm"),
  "transactionRef": string (transaction ID / mã giao dịch)
}
Return ONLY valid JSON, no markdown fences.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0 },
        }),
      }
    );

    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonText = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    return {
      amount: typeof parsed.amount === 'number' ? Math.round(parsed.amount) : null,
      recipient: String(parsed.recipient || ''),
      bankName: String(parsed.bankName || ''),
      accountNumber: String(parsed.accountNumber || ''),
      slipMessage: String(parsed.slipMessage || ''),
      transactionDate: String(parsed.transactionDate || new Date().toISOString().slice(0, 16)),
      transactionRef: String(parsed.transactionRef || ''),
      rawText: jsonText,
      engine: 'gemini',
    };
  } catch (err) {
    console.warn('Gemini OCR failed, falling back to Tesseract:', err);
    return null;
  }
}

export async function runSlipOcr(imagePath: string): Promise<OcrResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const geminiResult = await ocrWithGemini(imagePath, geminiKey);
    if (geminiResult) return geminiResult;
  }

  const worker = await createWorker('vie+eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(imagePath);

    const parsed = parseBankSlipText(text);
    return {
      ...parsed,
      rawText: text,
      engine: 'tesseract',
    };
  } finally {
    await worker.terminate();
  }
}
