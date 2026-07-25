# ExpenseTracker 💰

A full-stack personal finance tracker built with **FastAPI** (backend) + **React/Vite** (frontend).

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173

### Free WhatsApp Bot (Optional)
This project includes a 100% free local WhatsApp bot that allows you to add expenses directly via WhatsApp message.

To run the WhatsApp bot:
```bash
cd whatsapp-bot
npm install
npm start
```
Upon start, a QR code will be generated in your terminal. Scan this using the WhatsApp app on your phone (Linked Devices -> Link a Device).

Link your phone number in the Web UI (WhatsApp Bot page) and message your bot like `Coffee 80 upi` to add an expense!

---

## Features

### V1 (Core)
- ✅ Register / Login (JWT Auth)
- ✅ Categories CRUD (12 default categories seeded on register)
- ✅ Expenses CRUD (search, filter by category/payment/date)
- ✅ Income Tracking (Salary, Freelancing, Gifts, Other)
- ✅ Monthly & Weekly Budget (global + per-category)
- ✅ Dashboard (KPI cards, area chart, pie chart, recent expenses)

### V2 (Extended)
- ✅ Goals (Target, Saved, Progress %)
- ✅ Reminders (with overdue detection, mark-as-done)
- ✅ Recurring Transactions (weekly/monthly)
- ✅ Subscriptions (with expiry alerts)
- ✅ Audit Logs (expense added/edited/deleted)
- ✅ User Profile (name, currency, timezone, dark mode)
- ✅ Export CSV / Excel (with date range filters)
- ✅ Expense Attachments (file upload)

### V3 (Planned)
- [ ] AI Expense Entry
- [ ] OCR for receipts
- [ ] AI Insights
- [ ] Telegram/WhatsApp Logging

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Vanilla CSS, React Query, React Router v6, Recharts |
| Backend | FastAPI, SQLAlchemy, JWT, Pydantic v2 |
| Database | SQLite (local) / PostgreSQL (production) |
| Deployment | Docker Compose → Render/Railway |

## Database

The SQLite database file (`expense_tracker.db`) is created automatically on first run in the `backend/` directory.

To use PostgreSQL instead, update `.env`:
```
DATABASE_URL=postgresql://user:password@localhost/expense_tracker
```
