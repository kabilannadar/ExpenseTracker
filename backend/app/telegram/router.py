import os
import logging
import httpx
from datetime import date, timedelta, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models import (
    User, Expense, AuditLog, Category, Income, EMI, Debt, Goal,
    Subscription, Reminder, Budget, RecurringTransaction,
    IncomeSourceEnum, AuditActionEnum, FrequencyEnum
)
from app.auth import get_current_user
from app.telegram.parser import parse_expense_message, format_help_message, ParsedStatement
from app.services.notifications import check_and_notify_budget

logger = logging.getLogger(__name__)

# Router for settings API (prefixed with /api/telegram for frontend compatibility)
router = APIRouter(prefix="/api/telegram", tags=["Telegram"])

# Router for public Telegram webhooks (no prefix, resolves at /telegram/webhook)
webhook_router = APIRouter(tags=["Telegram Webhook"])

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

def send_telegram_reply(chat_id: int, text: str, reply_markup: Optional[dict] = None):
    """Helper to send a reply back to Telegram using the sendMessage API."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is not set — cannot send Telegram reply.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        r = httpx.post(url, json=payload, timeout=10.0)
        r.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to send Telegram message to {chat_id}: {e}")


def find_category_id(db: Session, user_id: int, suggested: Optional[str]) -> Optional[int]:
    if not suggested:
        return None
    cats = db.query(Category).filter(Category.user_id == user_id).all()
    for cat in cats:
        if cat.name.lower() == suggested.lower():
            return cat.id
        if cat.name.lower() in suggested.lower() or suggested.lower() in cat.name.lower():
            return cat.id
    return None


def save_and_format_statement(db: Session, user: User, parsed: ParsedStatement) -> tuple[str, dict]:
    """
    Save statement details into the database based on type, add audit log,
    and return a tuple of (formatted_markdown_response_str, response_dict).
    """
    note_str = f"\n📓 _{parsed.note}_" if parsed.note else ""

    if parsed.statement_type == "income":
        src_str = "other"
        title_lower = parsed.title.lower()
        if "salary" in title_lower:
            src_str = "salary"
        elif "freelance" in title_lower or "freelancing" in title_lower:
            src_str = "freelancing"
        elif "gift" in title_lower:
            src_str = "gifts"

        cat = db.query(Category).filter(
            Category.user_id == user.id,
            Category.type == "income",
            Category.name.ilike(src_str)
        ).first()
        
        cat_id = cat.id if cat else None
        
        if not cat_id:
            other_cat = db.query(Category).filter(
                Category.user_id == user.id,
                Category.type == "income",
                Category.name.ilike("other")
            ).first()
            cat_id = other_cat.id if other_cat else None

        source_enum_val = IncomeSourceEnum.other
        if src_str in ["salary", "freelancing", "gifts", "other"]:
            source_enum_val = IncomeSourceEnum(src_str)

        income = Income(
            user_id=user.id,
            category_id=cat_id,
            source=source_enum_val,
            amount=parsed.amount,
            date=parsed.date,
            payment_method=parsed.payment_method,
            note=f"{parsed.title} - {parsed.note}" if parsed.note else parsed.title
        )
        db.add(income)
        db.commit()
        db.refresh(income)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="income",
            entity_id=income.id,
            detail=f"Added via Chatbot/Telegram: '{parsed.title}' ₹{income.amount}"
        ))
        db.commit()

        msg = (
            f"💰 *Income Logged!*\n\n"
            f"📝 {parsed.title} — ₹{income.amount:g}\n"
            f"📅 {income.date.strftime('%d %b %Y')}  💳 {income.payment_method.upper()}"
            f"{note_str}\n\n"
            f"_View all income in the app._"
        )
        return msg, {"status": "success", "income_id": income.id}

    elif parsed.statement_type == "emi":
        emi = EMI(
            user_id=user.id,
            title=parsed.title,
            loan_type="General",
            principal_amount=parsed.amount,
            interest_rate=0.0,
            emi_amount=parsed.amount,
            start_date=parsed.date,
            end_date=parsed.date + timedelta(days=365),
            total_tenure=12,
            remaining_months=12,
            payment_due_date=parsed.date,
            payment_method=parsed.payment_method,
            notes=parsed.note
        )
        db.add(emi)
        db.commit()
        db.refresh(emi)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="emi",
            entity_id=emi.id,
            detail=f"Added via Chatbot/Telegram: EMI '{emi.title}' ₹{emi.emi_amount}"
        ))
        db.commit()

        msg = (
            f"🏦 *EMI Record Logged!*\n\n"
            f"📝 {emi.title} — ₹{emi.emi_amount:g}\n"
            f"📅 {emi.start_date.strftime('%d %b %Y')}  💳 {emi.payment_method.upper()}"
            f"{note_str}\n\n"
            f"_View all EMIs in the app._"
        )
        return msg, {"status": "success", "emi_id": emi.id}

    elif parsed.statement_type == "debt":
        debt = Debt(
            user_id=user.id,
            creditor=parsed.title,
            amount=parsed.amount,
            remaining_amount=parsed.amount,
            notes=parsed.note
        )
        db.add(debt)
        db.commit()
        db.refresh(debt)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="debt",
            entity_id=debt.id,
            detail=f"Added via Chatbot/Telegram: Debt '{debt.creditor}' ₹{debt.amount}"
        ))
        db.commit()

        msg = (
            f"🤝 *Debt Record Logged!*\n\n"
            f"👤 Creditor: {debt.creditor} — ₹{debt.amount:g}\n"
            f"📅 {date.today().strftime('%d %b %Y')}  💳 {parsed.payment_method.upper()}"
            f"{note_str}\n\n"
            f"_View all debts in the app._"
        )
        return msg, {"status": "success", "debt_id": debt.id}

    elif parsed.statement_type == "goal":
        goal = Goal(
            user_id=user.id,
            title=parsed.title,
            target_amount=parsed.amount,
            saved_amount=0.0,
            deadline=parsed.date if parsed.date != date.today() else None
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="goal",
            entity_id=goal.id,
            detail=f"Created via Chatbot/Telegram: Goal '{goal.title}' Target ₹{goal.target_amount}"
        ))
        db.commit()

        msg = (
            f"🎯 *Goal Created!*\n\n"
            f"📝 {goal.title}\n"
            f"🎯 Target: ₹{goal.target_amount:g}\n"
            f"💳 {parsed.payment_method.upper()}"
            f"{note_str}\n\n"
            f"_Track your goals in the web dashboard._"
        )
        return msg, {"status": "success", "goal_id": goal.id}

    elif parsed.statement_type == "subscription":
        sub = Subscription(
            user_id=user.id,
            name=parsed.title,
            amount=parsed.amount,
            billing_cycle="monthly",
            start_date=parsed.date,
            is_active=True,
            features=parsed.note
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="subscription",
            entity_id=sub.id,
            detail=f"Created via Chatbot/Telegram: Subscription '{sub.name}' ₹{sub.amount}"
        ))
        db.commit()

        msg = (
            f"🔄 *Subscription Added!*\n\n"
            f"📝 {sub.name} — ₹{sub.amount:g}/mo\n"
            f"📅 Starts: {sub.start_date.strftime('%d %b %Y')}  💳 {parsed.payment_method.upper()}"
            f"{note_str}\n\n"
            f"_View all subscriptions in the app._"
        )
        return msg, {"status": "success", "subscription_id": sub.id}

    elif parsed.statement_type == "reminder":
        remind_dt = datetime.combine(parsed.date, datetime.min.time())
        reminder = Reminder(
            user_id=user.id,
            title=parsed.title,
            remind_at=remind_dt,
            note=f"Amount: ₹{parsed.amount:g} | {parsed.note}" if parsed.note else f"Amount: ₹{parsed.amount:g}",
            is_done=False
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="reminder",
            entity_id=reminder.id,
            detail=f"Created via Chatbot/Telegram: Reminder '{reminder.title}'"
        ))
        db.commit()

        msg = (
            f"⏰ *Reminder Set!*\n\n"
            f"📝 {reminder.title}\n"
            f"💵 Amount: ₹{parsed.amount:g}\n"
            f"📅 Date: {parsed.date.strftime('%d %b %Y')}"
            f"{note_str}\n\n"
            f"_We will remind you on your dashboard!_"
        )
        return msg, {"status": "success", "reminder_id": reminder.id}

    elif parsed.statement_type == "category":
        existing_cat = db.query(Category).filter(
            Category.user_id == user.id,
            func.lower(Category.name) == parsed.title.lower()
        ).first()
        if existing_cat:
            return f"⚠️ Category *{existing_cat.name}* already exists!", {"status": "exists"}

        color = parsed.payment_method if (parsed.payment_method and parsed.payment_method.startswith("#")) else "#6366f1"
        icon = parsed.note if parsed.note else "tag"

        cat = Category(
            user_id=user.id,
            name=parsed.title,
            color=color,
            icon=icon,
            is_default=False
        )
        db.add(cat)
        db.commit()
        db.refresh(cat)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="category",
            entity_id=cat.id,
            detail=f"Created via Chatbot/Telegram: Category '{cat.name}'"
        ))
        db.commit()

        msg = (
            f"🏷️ *Category Created!*\n\n"
            f"📝 Name: *{cat.name}*\n"
            f"🎨 Color: `{cat.color}` | 🔘 Icon: `{cat.icon}`\n\n"
            f"_You can now assign expenses to this category._"
        )
        return msg, {"status": "success", "category_id": cat.id}

    elif parsed.statement_type == "budget":
        category_id = None
        cat_label = "Global Budget"
        if parsed.title and parsed.title.lower() not in {"global", "overall", "total", "budget"}:
            cat_obj_id = find_category_id(db, user.id, parsed.title)
            if cat_obj_id:
                category_id = cat_obj_id
                cat_obj = db.query(Category).get(category_id)
                cat_label = f"*{cat_obj.name}* Category"
            else:
                cat_label = f"*{parsed.title}* Category"

        existing_budget = db.query(Budget).filter(
            Budget.user_id == user.id,
            Budget.category_id == category_id
        ).first()

        if existing_budget:
            existing_budget.monthly_limit = parsed.amount
            budget_obj = existing_budget
        else:
            budget_obj = Budget(
                user_id=user.id,
                category_id=category_id,
                monthly_limit=parsed.amount
            )
            db.add(budget_obj)

        db.commit()
        db.refresh(budget_obj)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="budget",
            entity_id=budget_obj.id,
            detail=f"Set via Chatbot/Telegram: Budget limit ₹{parsed.amount} for {cat_label}"
        ))
        db.commit()

        msg = (
            f"📊 *Budget Set!*\n\n"
            f"🎯 Target: {cat_label}\n"
            f"💵 Monthly Limit: ₹{parsed.amount:g}\n\n"
            f"_Track budget progress on your web dashboard._"
        )
        return msg, {"status": "success", "budget_id": budget_obj.id}

    elif parsed.statement_type == "recurring":
        freq_enum = FrequencyEnum.weekly if parsed.payment_method == "weekly" else FrequencyEnum.monthly
        category_id = find_category_id(db, user.id, parsed.suggested_category)

        recurring = RecurringTransaction(
            user_id=user.id,
            category_id=category_id,
            title=parsed.title,
            amount=parsed.amount,
            frequency=freq_enum,
            next_due=parsed.date,
            is_active=True
        )
        db.add(recurring)
        db.commit()
        db.refresh(recurring)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="recurring_transaction",
            entity_id=recurring.id,
            detail=f"Created via Chatbot/Telegram: Recurring '{recurring.title}' ₹{recurring.amount} ({freq_enum.value})"
        ))
        db.commit()

        msg = (
            f"🔁 *Recurring Expense Added!*\n\n"
            f"📝 {recurring.title} — ₹{recurring.amount:g}\n"
            f"⏱️ Frequency: *{freq_enum.value.capitalize()}*\n"
            f"📅 Next Due: {recurring.next_due.strftime('%d %b %Y')}"
            f"{note_str}\n\n"
            f"_Automated recurring expense active._"
        )
        return msg, {"status": "success", "recurring_id": recurring.id}

    else:
        # Default: Expense
        category_id = find_category_id(db, user.id, parsed.suggested_category)
        expense = Expense(
            user_id=user.id,
            title=parsed.title,
            amount=parsed.amount,
            date=parsed.date,
            payment_method=parsed.payment_method,
            category_id=category_id,
            note=parsed.note,
            source="chatbot",
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)

        db.add(AuditLog(
            user_id=user.id,
            action=AuditActionEnum.added,
            entity_type="expense",
            entity_id=expense.id,
            detail=f"Created via Chatbot/Telegram: {expense.title} - ₹{expense.amount}"
        ))
        db.commit()

        # Check budget limits and notify
        check_and_notify_budget(db, user, expense)

        cat_str = f"  🏷️ {parsed.suggested_category.title()}" if parsed.suggested_category else ""
        msg = (
            f"✅ *Expense Added!*\n\n"
            f"📝 {expense.title} — ₹{expense.amount:g}\n"
            f"📅 {expense.date.strftime('%d %b %Y')}  💳 {expense.payment_method.upper()}{cat_str}"
            f"{note_str}"
        )
        return msg, {"status": "success", "expense_id": expense.id}


# ─── Public Telegram Webhook Endpoint ───────────────────────────────────────

@webhook_router.post("/telegram/webhook", include_in_schema=False)
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Telegram Bot API calls this webhook on every message.
    Configured at: /telegram/webhook
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON"}

    message = data.get("message", {})
    chat = message.get("chat", {})
    chat_id = chat.get("id")
    text = message.get("text", "").strip()

    if not chat_id or not text:
        return {"status": "ignored"}

    # 1. Look up user by Telegram Chat ID
    user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()

    # 2. Handle unlinked user
    if not user:
        frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
        reply_markup = None
        if frontend_url and "localhost" not in frontend_url and "127.0.0.1" not in frontend_url:
            link_url = f"{frontend_url}/telegram?chat_id={chat_id}"
            reply_markup = {
                "inline_keyboard": [
                    [{"text": "🔗 Connect Account", "url": link_url}]
                ]
            }

        if text.lower().startswith("/start"):
            send_telegram_reply(
                chat_id,
                f"🤖 *ExpenseTracker Assistant*\n\n"
                f"Welcome! I am your automated ledger assistant. I can log your expenses instantly in real-time as you message them.\n\n"
                f"⚠️ *Account Link Required*\n"
                f"To secure and connect this chat to your ExpenseTracker account:\n\n"
                f"1️⃣ Copy your secure Chat ID:\n"
                f"`{chat_id}`\n\n"
                f"2️⃣ Go to your web dashboard: *Settings → Telegram Bot*.\n"
                f"3️⃣ Paste the Chat ID and click *Link Telegram Account*.\n\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"💡 *Type /start anytime to view your Chat ID again.*",
                reply_markup=reply_markup
            )
        else:
            send_telegram_reply(
                chat_id,
                f"🔒 *Connection Required*\n\n"
                f"This Telegram chat is not linked to an ExpenseTracker account.\n\n"
                f"🔑 Your Chat ID:\n"
                f"`{chat_id}`\n\n"
                f"👉 Paste this ID under *Settings → Telegram Bot* in the web app to activate messaging logs.\n\n"
                f"💡 *Type /start anytime to link again or view your Chat ID.*",
                reply_markup=reply_markup
            )
        return {"status": "unlinked"}

    # 3. Handle help/hi/start commands
    if text.lower() in {"help", "/help", "hi", "hello", "start", "?", "/start"}:
        send_telegram_reply(chat_id, format_help_message())
        return {"status": "ok"}

    # 4. Parse statement using parser
    parsed = parse_expense_message(text)
    if parsed is None or parsed.amount <= 0:
        send_telegram_reply(
            chat_id,
            "❓ *Invalid Format*\n\n"
            "Format: `<title> <amount> <payment mode> <note>`\n"
            "Example: `Coffee 80 upi for lunch`\n\n"
            "Type *help* to see all examples & statement types."
        )
        return {"status": "invalid"}

    # 5. Save using the helper function and send response to Telegram
    msg_text, result_dict = save_and_format_statement(db, user, parsed)
    send_telegram_reply(chat_id, msg_text)
    return result_dict


# ─── Settings API endpoints ──────────────────────────────────────────────────

class LinkTelegramRequest(BaseModel):
    chat_id: str


@router.get("/status")
def telegram_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return whether current user has linked their Telegram chat ID."""
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "expensetrackertnbot")
    return {
        "linked": bool(current_user.telegram_chat_id),
        "telegram_chat_id": current_user.telegram_chat_id,
        "bot_username": bot_username,
    }


def sync_telegram_to_prod_db(local_user: User, chat_id: Optional[str]):
    """Optionally syncs telegram_chat_id for the user into PROD_DATABASE_URL, auto-creating the user in PROD if missing."""
    prod_db_url = os.getenv("PROD_DATABASE_URL", "").strip()
    if not prod_db_url or not local_user or not local_user.email:
        return
    if prod_db_url.startswith("postgres://"):
        prod_db_url = prod_db_url.replace("postgres://", "postgresql://", 1)
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        prod_engine = create_engine(prod_db_url)
        ProdSession = sessionmaker(bind=prod_engine)
        with ProdSession() as prod_session:
            # Check if this chat_id is already linked to another user in prod
            if chat_id:
                prod_conflict = prod_session.query(User).filter(User.telegram_chat_id == chat_id, User.email != local_user.email).first()
                if prod_conflict:
                    logger.warning(f"Telegram Chat ID '{chat_id}' is already linked to another user ({prod_conflict.email}) in PROD DB. Skipping prod sync.")
                    return

            prod_user = prod_session.query(User).filter(User.email == local_user.email).first()
            if not prod_user:
                if not chat_id:
                    return
                # User doesn't exist in prod yet, create them automatically so telegram logging works!
                prod_user = User(
                    name=local_user.name or local_user.email.split("@")[0],
                    email=local_user.email,
                    password_hash=local_user.password_hash,
                    currency=local_user.currency or "INR",
                    timezone=local_user.timezone or "Asia/Kolkata",
                    dark_mode=local_user.dark_mode if local_user.dark_mode is not None else True,
                    telegram_chat_id=chat_id
                )
                prod_session.add(prod_user)
                prod_session.commit()
                prod_session.refresh(prod_user)

                from app.routers.auth import seed_default_categories
                seed_default_categories(prod_session, prod_user.id)
                logger.info(f"Auto-created user '{local_user.email}' in PROD DB with telegram_chat_id='{chat_id}'")
            else:
                prod_user.telegram_chat_id = chat_id
                prod_session.commit()
                logger.info(f"Synced telegram_chat_id='{chat_id}' for '{local_user.email}' to PROD database.")
    except Exception as e:
        logger.error(f"Failed to sync Telegram chat ID to PROD database: {e}")


@router.post("/link")
def link_telegram(
    payload: LinkTelegramRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Link a Telegram Chat ID to the current authenticated user's account."""
    chat_id = payload.chat_id.strip()
    if not chat_id or not chat_id.replace("-", "").isdigit():
        raise HTTPException(400, "Invalid Telegram Chat ID format. Must be numeric.")

    # If already linked with this exact chat ID, don't re-send message
    if current_user.telegram_chat_id == chat_id:
        return {"message": "Telegram account is already linked.", "telegram_chat_id": chat_id}

    # Check if this chat ID is already linked to ANOTHER user locally
    existing = db.query(User).filter(User.telegram_chat_id == chat_id, User.id != current_user.id).first()
    if existing:
        raise HTTPException(409, "This Telegram account is already linked to another user.")

    current_user.telegram_chat_id = chat_id
    db.commit()
    db.refresh(current_user)

    # Sync to production DB if PROD_DATABASE_URL is configured (auto-creates if missing)
    sync_telegram_to_prod_db(current_user, chat_id)

    send_telegram_reply(
        int(chat_id),
        "🎉 *Congratulations!*\n\n"
        "Your Telegram account has been linked successfully to ExpenseTracker.\n"
        "You can now track expenses directly from this chat!"
    )

    return {"message": "Telegram account linked successfully!", "telegram_chat_id": chat_id}


@router.delete("/unlink")
def unlink_telegram(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unlink the Telegram Chat ID from the current user's account."""
    if not current_user.telegram_chat_id:
        raise HTTPException(400, "No Telegram account is currently linked.")

    chat_id = int(current_user.telegram_chat_id)
    current_user.telegram_chat_id = None
    db.commit()

    # Sync to production DB if PROD_DATABASE_URL is configured
    sync_telegram_to_prod_db(current_user, None)

    frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
    reply_markup = None
    if frontend_url and "localhost" not in frontend_url and "127.0.0.1" not in frontend_url:
        link_url = f"{frontend_url}/telegram?chat_id={chat_id}"
        reply_markup = {
            "inline_keyboard": [
                [{"text": "🔗 Connect Account", "url": link_url}]
            ]
        }

    send_telegram_reply(
        chat_id,
        "👋 *Telegram account unlinked!*\n\n"
        "You will no longer be able to log expenses via this bot.\n\n"
        "👉 *Type /start anytime to link again or get your Chat ID.*",
        reply_markup=reply_markup
    )

    return {"message": "Telegram account unlinked successfully."}


class LogTextRequest(BaseModel):
    text: str


@router.post("/log-text")
def log_text_via_chat(
    payload: LogTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Log a transaction from the web chatbot.
    Parses natural text using the same parser as the Telegram bot.
    """
    text = payload.text.strip()
    parsed = parse_expense_message(text)
    if parsed is None or parsed.amount <= 0:
        return {"status": "invalid", "message": "Invalid transaction command format."}

    msg_text, result_dict = save_and_format_statement(db, current_user, parsed)
    return {"status": "success", "message": msg_text, **result_dict}

