<div align="center">

  <img src="https://ik.imagekit.io/kabi10/tr:q-auto,f-auto/ExpenseTracker_Banner_Transparent.png" alt="ExpenseTracker Banner" width="480"/>

  <br/><br/>

  <h1>ExpenseTracker 💰</h1>
  <p><strong>Your finances, one conversation away.</strong></p>
  <p>A premium, full-stack personal finance and budget management web application.</p>

  <p>
    <a href="https://expensetrackerbykabs.vercel.app/"><strong>Official Product Portal →</strong></a> ·
    <a href="https://expensetrackertn.vercel.app/"><strong>Live App Dashboard →</strong></a> ·
    <a href="https://t.me/expensetrackertnbot"><strong>Telegram Bot Assistant →</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/FastAPI-0.111.0-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-18.x-61dafb?style=flat-square&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-8.x-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/SQLite-Local-003b57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
    <img src="https://img.shields.io/badge/PostgreSQL-Ready-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </p>

</div>

---

ExpenseTracker is a premium, full-stack personal finance and budget management web application. It features real-time expense and income tracking, budget caps, debt and EMI management, savings goals, automated cron transactions, smart email and Telegram alerts, comprehensive audit logs, and a 100% offline multilingual translation framework supporting English and 9 Indic languages.

Designed as an installable Progressive Web App (PWA) with a stunning glassmorphic interface, ExpenseTracker provides users with complete visibility and control over their financial health.

---

## 🌟 Core Features

### 📊 Financial Ledger & Budgeting
* **Expense & Income Logging**: Full CRUD operations for logging transactions with description, tags, custom dates, and payment methods.
* **Custom Categorization**: Create and color-code custom categories for both expenses and income to classify your spending/earnings.
* **Smart Budget Caps**: Set global monthly limits or custom per-category budget caps. The app displays real-time progress bars for each budget.
* **Interactive Dashboard**: View KPIs (Monthly Expense, Monthly Income, Net Savings, Weekly Outflow, and Spending Streaks), interactive Recharts trends (6-month history), and an animated category spending donut chart.

### 💳 Liabilities & Debt Management
* **Informal Debt Tracker**: Log and monitor informal or short-term debts to specific creditors (friends, family, credit cards). Tracks paid/remaining amounts and automatically marks debts as resolved.
* **Loans & EMI Manager**: Register long-term structured loans with bank/platform tracking, principal amounts, interest rates, payment methods, start dates, and monthly tenures.
* **Amortization Calculator**: Interactive financial calculator that generates a month-by-month payment schedule showing interest vs. principal split. Offers "Save to Track" functionality to directly log loans.

### 🐖 Savings & Goals Tracker
* **Savings Ledger**: Log manual savings transfers to keep track of money set aside.
* **Savings Goals**: Set up long-term financial goals with target amounts and due dates. Progress is automatically calculated and displayed as a percentage bar based on your saved transactions.

### 🤖 Automations & Integrations
* **ExpenseTracker Telegram Bot**: Link your account to search/add transactions, query category budgets, and configure alerts directly from Telegram in real-time.
* **Smart Alerts (Telegram + Email)**: Get notified instantly via Telegram and Email (powered by Resend API) when global or category budgets cross 80% (Warning) and 100% (Limit).
* **Automated Recurring Transactions**: Register repeating transactions (weekly, monthly, yearly) and let the background cron service auto-log them when due and roll over next due dates.
* **Advance Bill Reminders**: Receive proactive email/Telegram notifications 3 days before any upcoming bill payment, loan EMI, or subscription renewal.
* **Subscription Tracker**: Manage recurring subscription services (e.g., Netflix, Spotify) categorized by billing cycles (daily, weekly, monthly, yearly) with toggleable active status.

### 🔒 Security, Auditing & Data Operations
* **Activity Audit Logs**: An interactive security log page showing a historical timeline of user actions (creation, editing, or deletion of expenses, income, savings, goals, EMIs, and subscriptions).
* **Data Import (CSV)**: Import transaction records in bulk by uploading standard CSV files.
* **Data Export (Excel/CSV)**: Export your entire transaction ledger to download Excel (`.xlsx`) or CSV (`.csv`) formats. Offers customizable filters (Today, This Week, This Month, Last Month, Custom Date Range).

### 🎨 Premium User Experience (UX)
* **Progressive Web App (PWA)**: Complete service worker configuration allowing offline usability and native system installation (mobile and desktop) directly from the application sidebar.
* **Theme Customization**: Toggle between a premium glassmorphic dark mode and a sleek, clean light mode via user profile settings.
* **Google Authentication**: Single-click registration and login with Google OAuth2, automatically syncing and hosting Google profile pictures as avatars.
* **100% Offline Multilingual Support**: Localized client-side translation framework supporting 10 languages:
  * English, हिंदी (Hindi), தமிழ் (Tamil), తెలుగు (Telugu), ಕನ್ನಡ (Kannada), മലയാളം (Malayalam), मराठी (Marathi), ગુજરાતી (Gujarati), and বাংলা (Bengali).
* **Live Digital Clock**: Real-time ticking date and time clock widget built into the global desktop navigation header.
* **Interactive Onboarding Tour**: Step-by-step interactive walk-through (powered by `driver.js`) to assist new users in understanding the dashboard widgets.

---

## 🛠 Tech Stack

| Layer | Technologies & Libraries |
|---|---|
| **Frontend** | React 18, Vite, Vanilla CSS, React Query (TanStack), React Router v6, Recharts, Lucide React, i18next, driver.js |
| **Backend** | FastAPI, SQLAlchemy, Alembic, Uvicorn, Pydantic v2, Pandas, OpenPyXL, Python-Jose |
| **Database** | SQLite (default local) / PostgreSQL (production compatibility) |
| **Integrations** | Telegram Bot API, Resend Email API, Google OAuth2 |
| **Deployment** | Docker Compose, Render (Web Services + Background Crons) |

---

## 🚀 Local Setup & Installation

### Prerequisites
* Python 3.10+
* Node.js v18+
* SQLite or PostgreSQL

---

### 1. Backend Setup

1. **Navigate to the backend directory and set up a virtual environment:**
   ```bash
   cd backend
   python -m venv .venv
   ```
2. **Activate the virtual environment:**
   * **Windows:** `.venv\Scripts\activate`
   * **Linux/macOS:** `source .venv/bin/activate`
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Create a local environment file:**
   Duplicate `.env.example` as `.env` and fill out your variables:
   ```bash
   cp .env.example .env
   ```
5. **Run database migrations (Crucial):**
   Run the database schema setup command to initialize all required tables (expenses, income, savings, goals, EMIs, audits, etc.):
   ```bash
   alembic upgrade head
   ```
6. **Start the backend development server:**
   Ensure the backend runs on **port 8001** to align with the frontend proxy:
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```
   * Interactive API documentation is available at: http://localhost:8001/docs
   * Health endpoints are serving at: http://localhost:8001/health

---

### 2. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   * The application is running at: http://localhost:5173
   * Dev requests to `/api` are automatically proxied to the backend at http://localhost:8001.

---

### 🐳 Run using Docker Compose

If you have Docker installed, you can spin up the complete frontend, backend, and database in one command:
```bash
docker-compose up --build
```
* Frontend client: http://localhost:5173
* Backend API: http://localhost:8001

---

## 🤖 Telegram Bot Setup (Optional)

To enable conversational expense logging and alerts via Telegram:

1. Search for `@BotFather` on Telegram and send `/newbot` to create your bot. Copy the generated API Token.
2. Add the token to the backend `.env` file:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   ```
3. Start `ngrok` to expose your local backend server:
   ```bash
   ngrok http 8001
   ```
4. Copy the public HTTPS URL from ngrok (e.g., `https://xxxx.ngrok-free.dev`) and set it as `RENDER_EXTERNAL_URL` in backend `.env` so that the app registers the webhooks on startup:
   ```env
   RENDER_EXTERNAL_URL=https://xxxx.ngrok-free.dev
   ```
5. Run the backend. Your Telegram webhook is registered automatically! Go to the **ExpenseTracker Bot** setup page in the web app to link your account.

---

## 🌐 Localization Maintenance & Developer Pipeline

ExpenseTracker uses an automated translation pipeline for internationalization (i18n):

* **Extract & Update Translation Keys**:
  If you add new UI labels in JSX, run the following command from the frontend folder to scan, extract new terms, translate them via a local Hugging Face IndicTrans2 pipeline fallback, and recompile translations:
  ```bash
  npm run update:locales
  ```
* **Git Pre-Push Hook**:
  The project is pre-configured with a Git pre-push hook that automatically runs `scripts/update_locales.js` to ensure that no developer pushes code with missing or untranslated language bundles.

---

## 💾 Database Schema Updates (Alembic)

Whenever you alter SQLAlchemy models in `backend/app/models/`:

1. **Generate a migration script:**
   ```bash
   cd backend
   alembic revision --autogenerate -m "description_of_changes"
   ```
2. **Apply the migrations to your database:**
   ```bash
   alembic upgrade head
   ```
