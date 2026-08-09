from datetime import datetime, timezone
from fastapi import FastAPI, Depends, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app.models import Base
from app.routers import auth, categories, expenses, income, budgets, reminders, recurring, subscriptions, goals, audit_logs, users, export, analytics, emis, debts, savings, feedback, cron
from app.telegram import router as telegram_router

# Database tables and migrations are now managed via Alembic.

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

        # Reset passwords for old accounts in production to Password@123
        from app.auth import hash_password
        for target_email in ["kabs@gmail.com", "kabilan@gmail.com"]:
            user_obj = db.query(User).filter(User.email == target_email).first()
            if user_obj:
                user_obj.password_hash = hash_password("Password@123")
                db.flush()

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
    version="2.3.0",
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
app.include_router(cron.router)
app.include_router(telegram_router.router)
app.include_router(telegram_router.webhook_router)

@app.on_event("startup")
async def setup_telegram_webhook():
    import httpx
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    backend_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL")
    if token and backend_url:
        webhook_url = f"{backend_url.rstrip('/')}/telegram/webhook"
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"https://api.telegram.org/bot{token}/setWebhook",
                    json={"url": webhook_url},
                    timeout=10.0
                )
                r.raise_for_status()
                print(f"[Telegram Webhook] Successfully registered: {webhook_url}")
        except Exception as e:
            print(f"[Telegram Webhook] Failed to register: {e}")


@app.get("/")
def root():
    return {"message": "ExpenseTracker API is running", "docs": "/docs", "health": "/health"}


@app.get("/health", tags=["Health"])
@app.head("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
@app.head("/api/health", tags=["Health"])
def health_check(response: Response, db: Session = Depends(get_db)):
    """
    Lightweight health check endpoint for UptimeRobot and load balancers.
    Performs a fast DB ping to ensure connectivity and keeps Render active.
    """
    db_ok = True
    error_detail = None
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_ok = False
        error_detail = str(e)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if db_ok else "unhealthy",
        "service": "ExpenseTracker API",
        "database": "connected" if db_ok else f"disconnected: {error_detail}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/ping", tags=["Health"])
@app.head("/ping", tags=["Health"])
def ping():
    """Ultra-fast ping endpoint without database check."""
    return {"status": "ok", "pong": True}




