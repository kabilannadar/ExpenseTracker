# ExpenseTracker 💰

A full-stack personal finance tracker built with **FastAPI** (backend) + **React/Vite** (frontend).

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
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

## Version History & Major Features

### v1.x (Core Personal Finance)
- **Authentication**: Secure registration and login powered by JWT token auth.
- **Expense & Income Ledger**: Full CRUD support for logging transactions, search filters, and custom categorization.
- **Budgets**: Flexible monthly and weekly spending limits (global limits or customized per-category caps).
- **Dashboard**: Sleek UI with financial KPIs, interactive expense trends (Recharts), and spending distribution breakdowns.

### v2.0 - v2.1 (Liabilities & Integrations)
- **ExpenseTracker Telegram Bot**: Real-time transactions, budget queries, and alerts directly from Telegram.
- **OAuth2 Flow**: Secure single-click login with Google Sign-In integration.
- **Loans & Liabilities Tracker**: Standalone tracking page with aggregate debt metrics and manual EMI registration.
- **Amortization Calculator**: Interactive calculator with month-by-month schedules.
- **Support & FAQ Center**: Live ticket logging system and interactive accordion-based knowledge base.

### v2.2 - v2.3.2 (Automations & PWA App)
- **Smart Alerts**: Automatic warnings via Telegram and Email when global or category budgets hit 80% or 100%.
- **Recurring Transactions**: Automated cron engine logging weekly/monthly repeating transactions and rolling over next due dates.
- **EMI & Bill Reminders**: Proactive 3-day advance alerts for upcoming reminders and renewals.
- **PWA Support**: Offline capability and standalone desktop/mobile installation options directly from the app interface.
- **Interactive Onboarding Tour**: Guided step-by-step UI walkthrough using `driver.js` to assist new users.
- **Google Profile Sync**: Sync Google avatars or upload custom profile pictures with backend storage.

### v2.3.3 (Multilingual Localization & Offline i18n)
- **9 Indic Languages Support**: 100% offline, client-side translation framework supporting:
  - English, हिंदी (Hindi), தமிழ் (Tamil), తెలుగు (Telugu), ಕನ್ನಡ (Kannada), മലയാളം (Malayalam), मराठी (Marathi), ગુજરાતી (Gujarati), and বাংলা (Bengali).
- **Responsive Language Selector**: Sleek, custom-designed header selector with native script names, country flag codes, and touch polish for mobile screen views.
- **Automated Developer Pipeline**: Git pre-push hook configuration running `update_locales.js` to auto-extract, translate (via local Hugging Face IndicTrans2 model), and compile locales bundle during push.

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
