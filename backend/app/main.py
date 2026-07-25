# Connected to Neon DB Cloud Instance - env reload triggered
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine
from app.models import Base
from app.routers import auth, categories, expenses, income, budgets, reminders, recurring, subscriptions, goals, audit_logs, users, export, analytics, emis, debts, savings, feedback
from app.telegram import router as telegram_router

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
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN whatsapp_number VARCHAR(20)"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(50)"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("UPDATE income SET source = 'other' WHERE source = 'cable'"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE categories ADD COLUMN type VARCHAR(20) DEFAULT 'expense'"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE income ADD COLUMN category_id INTEGER REFERENCES categories(id)"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
        conn.commit()
    except Exception:
        pass

# Run data migrations and seed default income categories
from sqlalchemy.orm import sessionmaker
from app.models import User, Category, Income
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_and_seed_data():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            # Check if default income categories exist. If not, create them.
            income_cats = {
                cat.name.lower(): cat 
                for cat in db.query(Category).filter(Category.user_id == user.id, Category.type == "income").all()
            }
            
            defaults = [
                {"name": "Salary", "color": "#10b981", "icon": "trending-up"},
                {"name": "Freelancing", "color": "#3b82f6", "icon": "briefcase"},
                {"name": "Gifts", "color": "#f59e0b", "icon": "gift"},
                {"name": "Other", "color": "#6b7280", "icon": "coins"}
            ]
            
            for d in defaults:
                name_lower = d["name"].lower()
                if name_lower not in income_cats:
                    new_cat = Category(
                        user_id=user.id,
                        name=d["name"],
                        type="income",
                        color=d["color"],
                        icon=d["icon"],
                        is_default=True
                    )
                    db.add(new_cat)
                    db.flush()
                    income_cats[name_lower] = new_cat
            
            # For all income records of this user that have no category_id set, map them.
            unmapped_incomes = db.query(Income).filter(Income.user_id == user.id, Income.category_id.is_(None)).all()
            for inc in unmapped_incomes:
                if inc.source:
                    src = (inc.source.value if hasattr(inc.source, "value") else str(inc.source)).lower()
                else:
                    src = "other"
                if src == "cable":
                    src = "other"
                cat_obj = income_cats.get(src, income_cats.get("other"))
                if cat_obj:
                    inc.category_id = cat_obj.id
        db.commit()
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

migrate_and_seed_data()

# Create uploads dir
os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)

app = FastAPI(
    title="ExpenseTracker API",
    description="Personal finance tracker — track expenses, income, goals, and more.",
    version="1.0.0",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "")

allowed_origins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"]
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

import traceback
from datetime import datetime
from fastapi import Request

@app.middleware("http")
async def log_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        tb = traceback.format_exc()
        # Write to the absolute path of the brain folder so the parent agent can read it
        log_path = r"C:\Users\rrkab\.gemini\antigravity-ide\brain\5d6dad1b-429d-4e4c-93f7-cf8562907f62\backend_error.log"
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"\n--- EXCEPTION AT {datetime.now()} ---\n")
                f.write(f"URL: {request.url}\n")
                f.write(tb)
                f.write("="*80 + "\n")
        except Exception:
            pass
        print(f"[ERROR LOGGER] Exception captured: {e}")
        raise e


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
app.include_router(feedback.router)
app.include_router(telegram_router.router)
app.include_router(telegram_router.webhook_router)


@app.get("/")
def root():
    return {"message": "ExpenseTracker API is running", "docs": "/docs"}




