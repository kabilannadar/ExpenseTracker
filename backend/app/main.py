# Connected to Neon DB Cloud Instance
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine
from app.models import Base
from app.routers import auth, categories, expenses, income, budgets, reminders, recurring, subscriptions, goals, audit_logs, users, export, analytics, emis, debts, savings

# Create all DB tables
Base.metadata.create_all(bind=engine)

# Run schema migrations for SQLite (add columns if missing)
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE emis ADD COLUMN loan_platform VARCHAR(100)"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE income ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash'"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE savings ADD COLUMN type VARCHAR(20) DEFAULT 'credit'"))
        conn.commit()
    except Exception:
        pass

# Create uploads dir
os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)

app = FastAPI(
    title="ExpenseTracker API",
    description="Personal finance tracker — track expenses, income, goals, and more.",
    version="1.0.0",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "")

allowed_origins = ["http://localhost:5173", "http://localhost:3000"]
if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https?://.*\.ngrok-free\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads for static serving
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include all routers
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(expenses.router)
app.include_router(income.router)
app.include_router(budgets.router)
app.include_router(reminders.router)
app.include_router(recurring.router)
app.include_router(subscriptions.router)
app.include_router(goals.router)
app.include_router(audit_logs.router)
app.include_router(users.router)
app.include_router(export.router)
app.include_router(analytics.router)
app.include_router(emis.router)
app.include_router(debts.router)
app.include_router(savings.router)


@app.get("/")
def root():
    return {"message": "ExpenseTracker API is running", "docs": "/docs"}
