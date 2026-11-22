# FinControl — Debit Card & Bank Slip Tracker

Self-hosted finance & debit card tracker designed for VND and Vietnamese bank transfer slips (Techcombank, Vietcombank, MB Bank, ACB, BIDV, TPBank, Momo, etc.), ready to deploy on **Coolify**.

## Features
- **Bank Slip Screenshot Upload + OCR**: Drop, browse, or paste (`Ctrl+V`) a paid bank slip screenshot. Built-in OCR (`tesseract.js` with `vie+eng`, or optional Gemini Vision via `GEMINI_API_KEY`) auto-extracts the VND amount, recipient, bank, account number, message, date, and transaction reference.
- **Purpose & Category Tracking**: Write what each payment was done for and categorize expenses.
- **Debit Card Balance**: Add top-ups (e.g., `100.000.000 ₫`) and track remaining balance, total added, total spent, and average payment.
- **Overviews & Sorting**: Category spending breakdown, monthly cashflow bars, full search, date/type/category filters, column sorting, and CSV export.
- **Optional Password Protection**: Set `APP_PASSWORD` in Coolify to protect your dashboard with a login screen.

## Deploying on Coolify
1. Create a new **Application** in Coolify from this Git repository (Build Pack: **Dockerfile**).
2. Set **Ports Exposes** to `3000`.
3. Under **Storages**, add a persistent volume:
   - **Source**: `/data/fincontrol` (or a named volume)
   - **Destination Path**: `/app/data` *(stores SQLite `finance.db` and uploaded slip images)*
4. Under **Environment Variables**, optionally set:
   - `APP_PASSWORD=your-secret-password`
   - `GEMINI_API_KEY=your-key` *(optional; built-in Tesseract OCR works without any API key)*
5. Deploy!

## Local Development
```bash
npm install
npm run dev
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
