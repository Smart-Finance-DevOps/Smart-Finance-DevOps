# SmartFinance

A personal finance tracker with receipt scanning using Tesseract OCR.

---

## Quick Start (Windows)

### Step 1 — Install MongoDB
Download and install from: https://www.mongodb.com/try/download/community  
Choose: Windows → MSI → Install with all defaults. It runs automatically as a service.

### Step 2 — Set up backend config
1. Go into the `backend/` folder
2. Copy `.env.example` and rename the copy to `.env`
3. Open `.env` and change `JWT_SECRET` to any random text e.g. `mySecretKey123`

### Step 3 — Run everything
Double-click `start.bat` in this folder.

It will automatically install dependencies and start all 3 services.  
Then open: **http://localhost:5173**

---

## How Receipt Scanning Works

1. Upload a receipt image on the Scan Receipt page
2. Image goes to the backend → forwarded to the OCR service (Tesseract.js)
3. Tesseract reads the text from the image
4. Text is parsed for amount, date, merchant name, and category
5. Form is auto-filled — you can edit before saving

---

## Manual Start (3 terminals)

Terminal 1 — OCR Service:
  cd receipt-ocr && npm install && node server.js

Terminal 2 — Backend:
  cd backend && npm install && npm run dev

Terminal 3 — Frontend:
  cd frontend && npm install && npm run dev
