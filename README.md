<div align="center">

  <img src="https://ik.imagekit.io/kabi10/tr:q-auto,f-auto/ExpenseTracker_Banner_Transparent.png" alt="ExpenseTracker Banner" width="480"/>

  <br/><br/>

  <h1>ExpenseTracker 💰</h1>
  <p><strong>Your finances, completely under control.</strong></p>
  <p>A premium, full-stack personal finance and budget management web application.</p>

  <p>
    <a href="https://expensetrackerbykabs.vercel.app/"><strong>Official Product Portal →</strong></a> ·
    <a href="https://expensetrackertn.vercel.app/"><strong>Live App Dashboard →</strong></a> ·
    <a href="https://t.me/expensetrackertnbot"><strong>Telegram Bot →</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/FastAPI-0.111.0-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-18.x-61dafb?style=flat-square&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-8.x-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/SQLite%2FPostgreSQL-Database-003b57?style=flat-square&logo=postgresql&logoColor=white" alt="Database" />
    <img src="https://img.shields.io/badge/PWA-Installable-5a0fc8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
  </p>

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Docker Compose](#docker-compose)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Telegram Bot Setup](#telegram-bot-setup)
- [Localization Pipeline](#localization-pipeline)
- [Database Migrations](#database-migrations)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**ExpenseTracker** is a production-grade, full-stack personal finance platform. It goes far beyond simple expense logging — it's a complete financial command center featuring real-time budget alerts, automated recurring transactions, debt and EMI tracking, savings goals, a Telegram bot integration, CSV/Excel data exports, and a 100% offline multilingual UI supporting English and 9 Indic languages.

The system is composed of:

- A **FastAPI** backend with JWT authentication, SQLAlchemy ORM, Alembic migrations, background cron jobs, and Telegram webhook integration.
- A **React/Vite** frontend with TanStack React Query, Recharts analytics, i18next localization, and a glassmorphic design system.
- A **Progressive Web App (PWA)** layer with a service worker for offline usage and native system installation.

---

## Features

### 📊 Financial Ledger & Budgeting

- **Expense & Income Logging**: Full CRUD for transactions with descriptions, custom dates, payment methods, and category tagging.
- **Custom Categorization**: Create and color-code custom categories for both expenses and income.
- **Smart Budget Caps**: Set global monthly limits or per-category caps with real-time progress bars.
- **Interactive Dashboard**: KPI cards (monthly spend, income, net savings, weekly outflow, spending streak), a 6-month Recharts trend line, and an animated category spending donut chart.

### 💳 Liabilities & Debt Management

- **Informal Debt Tracker**: Log debts to specific creditors with paid/remaining amounts; auto-marks as resolved when balance hits zero.
- **Loans & EMI Manager**: Track structured bank loans with principal, interest rate, platform, tenure, and start date.
- **Amortization Calculator**: Month-by-month repayment schedule with interest vs. principal breakdown. "Save to Track" logs it directly as an EMI.

### 🐖 Savings & Goals

- **Savings Ledger**: Log manual savings transfers with titles and dates.
- **Savings Goals**: Set financial targets with deadlines; progress percentage auto-calculates from logged savings.

### 🤖 Automations & Integrations

- **ExpenseTracker Telegram Bot**: Link your account to log expenses, query budgets, and receive alerts via `@expensetrackertnbot`.
- **Smart Alerts (Telegram + Email)**: Automated notifications via Telegram and Resend Email when budgets cross 80% (warning) and 100% (exceeded) thresholds.
- **Recurring Transactions**: Cron engine auto-logs repeating expenses/income when due and rolls over next due dates.
- **Advance Bill Reminders**: Proactive 3-day-ahead alerts for upcoming EMIs, bill payments, and subscription renewals.
- **Subscription Tracker**: Manage recurring subscriptions by billing cycle (daily, weekly, monthly, yearly) with toggleable active status.

### 🔒 Security, Auditing & Data

- **Activity Audit Logs**: Full timeline of all user actions — additions, edits, and deletions across all modules.
- **Data Import (CSV)**: Bulk-import transaction records by uploading a CSV file.
- **Data Export (CSV/Excel)**: Export expense ledger as `.csv` or `.xlsx` with flexible date filters (Today, This Week, This Month, Last Month, All Time, Custom Range).

### 🎨 Premium UX

- **Progressive Web App (PWA)**: Offline capable with native installation on desktop and mobile directly from the sidebar.
- **Dark / Light Theme**: Toggle glassmorphic dark mode or clean light mode from user profile settings.
- **Google OAuth**: Single-click registration and login; Google avatars synced and displayed automatically.
- **100% Offline i18n**: Client-side translation supporting 10 languages — English, हिंदी, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, मराठी, ગુજરાતી, and বাংলা.
- **Interactive Onboarding Tour**: Step-by-step guided walkthrough via `driver.js` for new users.
- **Live Header Clock**: Real-time ticking date and time clock in the global navigation header.

---

## Architecture

```
+------------------------------------------------------------------+
|                        Browser (PWA)                             |
|  +------------------------------------------------------------+  |
|  |              React 18 + Vite Frontend                      |  |
|  |  +----------+ +----------+ +----------+ +--------------+   |  |
|  |  |Dashboard | |Expenses/ | |Loans/EMI | |Telegram Bot  |   |  |
|  |  |          | |Income    | |Debt      | |Setup         |   |  |
|  |  +----------+ +----------+ +----------+ +--------------+   |  |
|  |  +----------+ +----------+ +----------+ +--------------+   |  |
|  |  |Savings/  | |Budgets/  | |Recurring/| |Audit Logs /  |   |  |
|  |  |Goals     | |Reminders | |Subscript.| |Profile       |   |  |
|  |  +----------+ +----------+ +----------+ +--------------+   |  |
|  +------------------------------------------------------------+  |
|          | HTTP/REST + Axios                                      |
+----------|-------------------------------------------------------+
           |
+----------v-------------------------------------------------------+
|                  FastAPI Backend (Uvicorn, port 8001)            |
|  +---------------+  +------------------+  +------------------+  |
|  | /api/expenses |  | /api/analytics   |  | /api/export      |  |
|  | /api/income   |  | /api/budgets     |  | /api/savings     |  |
|  | /api/goals    |  | /api/emis        |  | /api/debts       |  |
|  | /api/recurring|  | /api/reminders   |  | /api/subscript.  |  |
|  | /api/auth     |  | /telegram/webhook|  | /api/audit-logs  |  |
|  +---------------+  +------------------+  +------------------+  |
|          |                    |                    |             |
|  +-------v--------------------v--------------------v---------+  |
|  |           SQLAlchemy ORM + Alembic Migrations             |  |
|  |           SQLite (dev)  /  PostgreSQL (prod)              |  |
|  +-----------------------------------------------------------+  |
|          |                                                       |
|  +-------v-----------+   +------------------------------------+  |
|  | Telegram Bot API  |   | Resend Email API (Budget Alerts)  |  |
|  +-------------------+   +------------------------------------+  |
+------------------------------------------------------------------+
```

---

## Project Structure

```
ExpenseTracker/
├── backend/
│   ├── app/
│   │   ├── auth/                   # JWT auth helpers
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── routers/                # All FastAPI route modules
│   │   │   ├── analytics.py        # Dashboard stats endpoint
│   │   │   ├── audit_logs.py       # Activity audit log
│   │   │   ├── auth.py             # Login, register, Google OAuth
│   │   │   ├── budgets.py          # Budget CRUD
│   │   │   ├── categories.py       # Category CRUD
│   │   │   ├── cron.py             # Recurring transaction cron trigger
│   │   │   ├── debts.py            # Informal debt tracking
│   │   │   ├── emis.py             # EMI / loan tracking
│   │   │   ├── expenses.py         # Expense CRUD + CSV import
│   │   │   ├── export.py           # CSV / Excel export
│   │   │   ├── feedback.py         # Support & feedback tickets
│   │   │   ├── goals.py            # Savings goals CRUD
│   │   │   ├── income.py           # Income CRUD
│   │   │   ├── recurring.py        # Recurring transaction CRUD
│   │   │   ├── reminders.py        # Bill reminder CRUD
│   │   │   ├── savings.py          # Savings ledger CRUD
│   │   │   ├── subscriptions.py    # Subscription tracker CRUD
│   │   │   └── users.py            # User profile & avatar upload
│   │   ├── schemas/                # Pydantic v2 request/response models
│   │   ├── services/               # Notification service (Telegram + Email)
│   │   ├── telegram/               # Telegram webhook router & parser
│   │   ├── database.py             # SQLAlchemy engine and session
│   │   ├── logger.py               # Centralized structured logger
│   │   └── main.py                 # FastAPI app, middleware, router includes
│   ├── alembic/                    # Database migration scripts
│   ├── tests/                      # Pytest test suite
│   ├── keep_alive.py               # Self-ping script for free-tier hosting
│   ├── alembic.ini
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   ├── sw.js                   # Service worker (PWA offline support)
│   │   └── manifest.json           # PWA manifest
│   ├── src/
│   │   ├── api/                    # Axios API client modules
│   │   ├── components/             # Reusable UI components (Sidebar, Modal…)
│   │   ├── context/                # AuthContext, PWAContext
│   │   ├── data/                   # Static data (updatesData.js…)
│   │   ├── locales/                # i18n JSON translation files (9 languages)
│   │   ├── pages/                  # Page components (Dashboard, Expenses…)
│   │   ├── utils/                  # translator.js, locales.js bundle
│   │   ├── App.jsx                 # Route definitions + lazy loading
│   │   ├── i18n.js                 # i18next initializer
│   │   └── index.css               # Global design system & Vanilla CSS
│   ├── vite.config.js
│   └── package.json
│
├── scripts/
│   ├── update_locales.js           # i18n maintenance pipeline (extract → translate → compile)
│   └── translate_locales.py        # Calls IndicTrans2 / mtranslate for translation
│
├── .github/
│   └── workflows/                  # GitHub Actions (keep-alive cron)
│
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

## Tech Stack

| Layer                  | Technologies & Libraries                                              |
| ---------------------- | --------------------------------------------------------------------- |
| **Frontend Framework** | React 18, Vite 8, Vanilla CSS                                         |
| **State & Data**       | TanStack React Query, React Router v6, Axios                          |
| **Charts & UI**        | Recharts, Lucide React, driver.js (onboarding tour)                   |
| **i18n**               | i18next, react-i18next (9 Indic languages, 100% offline)              |
| **Backend Framework**  | FastAPI, Uvicorn, Pydantic v2                                         |
| **ORM & Migrations**   | SQLAlchemy, Alembic                                                   |
| **Auth**               | JWT (python-jose), bcrypt, Google OAuth 2.0                           |
| **Database**           | SQLite (local dev) / PostgreSQL (production)                          |
| **Data Export**        | Pandas, OpenPyXL                                                      |
| **Notifications**      | Telegram Bot API, Resend Email API                                    |
| **Deployment**         | Docker Compose, Render (Web Services + Background Cron Workers)       |

---

## Getting Started

### Prerequisites

- **Python** 3.10+
- **Node.js** v18+ and npm
- **SQLite** (bundled) or **PostgreSQL** (for production)
- **Telegram Bot Token** (optional, for bot integration) — create one via [@BotFather](https://t.me/BotFather)
- **Google OAuth Client ID** (optional, for Google Sign-In) — set up at [Google Cloud Console](https://console.cloud.google.com)

---

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create your .env file (see Environment Variables section)
cp .env.example .env

# 5. Run database migrations to create all tables
alembic upgrade head

# 6. Start the backend server (port 8001 matches the frontend proxy)
uvicorn app.main:app --reload --port 8001
```

- **Interactive API docs:** http://localhost:8001/docs
- **Health check:** http://localhost:8001/health

---

### Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

- **App:** http://localhost:5173
- Dev requests to `/api` and `/uploads` are automatically proxied to the backend at `http://localhost:8001`.

---

### Docker Compose

Spin up the full stack (frontend + backend) with a single command:

```bash
docker-compose up --build
```

| Service  | URL                    |
| -------- | ---------------------- |
| Frontend | http://localhost:5173  |
| Backend  | http://localhost:8001  |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                 | Required     | Description                                                                            |
| ------------------------ | ------------ | -------------------------------------------------------------------------------------- |
| `SECRET_KEY`             | ✅ Required  | Strong random secret for JWT signing. **Must be changed in production.**               |
| `ALGORITHM`              | ✅ Required  | JWT algorithm (default: `HS256`).                                                      |
| `DATABASE_URL`           | ⚠️ Prod      | PostgreSQL connection URL. Leave blank to use local SQLite.                            |
| `UPLOAD_DIR`             | ⚠️ Optional  | Directory for storing uploaded profile pictures (default: `./uploads`).                |
| `FRONTEND_URL`           | ⚠️ Optional  | Production frontend URL added to CORS allowed origins.                                 |
| `TELEGRAM_BOT_TOKEN`     | ⚠️ Optional  | Telegram Bot API token from @BotFather (required to enable the bot).                   |
| `RENDER_EXTERNAL_URL`    | ⚠️ Optional  | Public backend URL used to auto-register the Telegram webhook on startup.              |
| `ENVIRONMENT`            | ❌ Optional  | `development` or `production` (default: `development`).                                |

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

### Frontend (`frontend/.env`)

| Variable               | Required     | Description                                                                        |
| ---------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID`| ⚠️ Optional  | Google OAuth 2.0 client ID (required for Google Sign-In to work).                  |
| `VITE_API_URL`         | ❌ Optional  | Absolute backend URL for production builds. Leave empty for local dev (uses proxy). |

---

## API Reference

All endpoints are served by the FastAPI backend. Interactive docs at `http://localhost:8001/docs`.

### Health

| Method  | Endpoint        | Description                             |
| ------- | --------------- | --------------------------------------- |
| `GET`   | `/health`       | Liveness check: `{"status": "ok"}`      |
| `HEAD`  | `/health`       | Same as above, no body.                 |
| `GET`   | `/ping`         | Ultra-fast ping (no DB check).          |

### Authentication

| Method | Endpoint                    | Description                                      |
| ------ | --------------------------- | ------------------------------------------------ |
| `POST` | `/api/auth/register`        | Register a new account with email + password.    |
| `POST` | `/api/auth/login`           | Email/password login; returns JWT access token.  |
| `POST` | `/api/auth/google`          | Login / register via Google OAuth ID token.      |
| `POST` | `/api/auth/send-otp`        | Send email OTP for email verification.           |
| `POST` | `/api/auth/verify-otp`      | Verify OTP to activate account.                  |
| `GET`  | `/api/auth/me`              | Return currently authenticated user profile.     |

### Expenses

| Method   | Endpoint                | Auth     | Description                                      |
| -------- | ----------------------- | -------- | ------------------------------------------------ |
| `GET`    | `/api/expenses`         | User JWT | List all expenses with optional filters.         |
| `POST`   | `/api/expenses`         | User JWT | Create a new expense record.                     |
| `PUT`    | `/api/expenses/{id}`    | User JWT | Update an existing expense.                      |
| `DELETE` | `/api/expenses/{id}`    | User JWT | Soft-delete an expense.                          |
| `POST`   | `/api/expenses/import`  | User JWT | Bulk-import expenses from a CSV file upload.     |

### Export

| Method | Endpoint           | Auth     | Description                                             |
| ------ | ------------------ | -------- | ------------------------------------------------------- |
| `GET`  | `/api/export/csv`  | User JWT | Download expenses as `.csv` with optional date filters. |
| `GET`  | `/api/export/excel`| User JWT | Download expenses as `.xlsx` with optional date filters.|

**Supported `date_filter` values:** `today`, `this_week`, `this_month`, `last_month`, `all_time`, `custom` (requires `date_from` + `date_to`).

### Analytics

| Method | Endpoint               | Auth     | Description                                                    |
| ------ | ---------------------- | -------- | -------------------------------------------------------------- |
| `GET`  | `/api/analytics/dashboard` | User JWT | Full dashboard stats: KPIs, monthly trend, category breakdown. |

### Other Modules

All modules follow the same RESTful pattern (`GET /`, `POST /`, `PUT /{id}`, `DELETE /{id}`):

| Module          | Base Path              |
| --------------- | ---------------------- |
| Income          | `/api/income`          |
| Budgets         | `/api/budgets`         |
| Categories      | `/api/categories`      |
| Savings         | `/api/savings`         |
| Goals           | `/api/goals`           |
| Recurring       | `/api/recurring`       |
| Reminders       | `/api/reminders`       |
| Subscriptions   | `/api/subscriptions`   |
| EMIs / Loans    | `/api/emis`            |
| Debts           | `/api/debts`           |
| Audit Logs      | `/api/audit-logs`      |
| User Profile    | `/api/users/me`        |

---

## Telegram Bot Setup

To enable conversational expense logging, budget queries, and proactive alerts via Telegram:

1. Message `@BotFather` on Telegram → `/newbot` → copy the **API Token**.
2. Add it to `backend/.env`:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   ```
3. Expose your local backend with ngrok:
   ```bash
   ngrok http 8001
   ```
4. Set the public URL so the app auto-registers the webhook on startup:
   ```env
   RENDER_EXTERNAL_URL=https://xxxx.ngrok-free.dev
   ```
5. Start the backend — the webhook registers automatically. Open the **ExpenseTracker Bot** page in the app to link your account.

---

## Localization Pipeline

ExpenseTracker uses an automated pipeline to keep all 9 Indic language translations in sync:

- **Extract & translate new strings** (run from the repo root after adding new UI text):
  ```bash
  cd frontend && npm run update:locales
  ```
  This scans all JSX files, detects new strings, translates them via the IndicTrans2 / mtranslate fallback, and recompiles `src/utils/locales.js`.

- **Git pre-push hook** — automatically runs `scripts/update_locales.js` on every push to prevent untranslated strings from reaching the remote. Skip with `git push --no-verify` if the model is unavailable locally.

---

## Database Migrations

Schema changes are managed with **Alembic**. After editing models in `backend/app/models/`:

```bash
cd backend

# Generate a new migration script
alembic revision --autogenerate -m "describe_your_change"

# Apply pending migrations
alembic upgrade head

# Rollback one step (if needed)
alembic downgrade -1
```

---

## Security

| Area                    | Implementation                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **JWT Signing**         | `SECRET_KEY` env var required; HS256-signed access tokens with configurable expiry.               |
| **Password Hashing**    | `bcrypt` via `passlib[bcrypt]`. Plain-text passwords are never stored.                            |
| **CORS**                | Restricted to explicit `FRONTEND_URL` + local dev origins; Vercel wildcard via regex middleware.  |
| **Structured Logging**  | Every request gets a unique `request_id`; unhandled errors are logged with user context.          |
| **Secrets Management**  | `.env` is gitignored. All secrets loaded exclusively from environment variables.                  |
| **Avatar Storage**      | Profile pictures stored server-side in `./uploads`; served as static files, never publicly listed.|

> ⚠️ **Important:** The example `.env.example` values in this repo are for local development only. **Rotate all secrets before deploying to production.**

---

## Contributing

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes with clear, descriptive commit messages.
4. Run the backend test suite:
   ```bash
   cd backend
   pytest
   ```
5. Open a Pull Request describing what you changed and why.

---

## License

This project is proprietary software. All rights reserved.
