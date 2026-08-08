import os
import logging
import httpx
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import date, timedelta, datetime, timezone
from typing import Optional, List
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models import (
    User, Budget, Expense, Category, AuditLog, RecurringTransaction,
    Reminder, EMI, Subscription, AuditActionEnum, FrequencyEnum
)

import threading

logger = logging.getLogger(__name__)

# ─── Dispatchers ──────────────────────────────────────────────────────────────

def _sync_send_telegram(chat_id: str, text_message: str):
    """Internal synchronous Telegram message sender."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text_message,
        "parse_mode": "Markdown"
    }
    try:
        r = httpx.post(url, json=payload, timeout=10.0)
        r.raise_for_status()
    except Exception as e:
        logger.error(f"[Notifications] Failed to send Telegram notification to {chat_id}: {e}")


def send_telegram_notification(chat_id: str, text_message: str):
    """Dispatches Telegram notification in background thread so request never blocks."""
    threading.Thread(target=_sync_send_telegram, args=(chat_id, text_message), daemon=True).start()


def _sync_send_email(to_email: str, subject: str, html_content: str):
    """Internal synchronous transactional HTML email dispatcher via Resend API / SMTP."""
    if not to_email:
        return

    # 1. Resend API
    resend_api_key = os.getenv("RESEND_API_KEY")
    if resend_api_key:
        try:
            r = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "ExpenseTracker <onboarding@resend.dev>",
                    "to": to_email,
                    "subject": subject,
                    "html": html_content,
                },
                timeout=10.0
            )
            if r.status_code in [200, 201]:
                logger.info(f"[Notifications] Email sent via Resend to {to_email}")
                return
            else:
                logger.warning(f"[Notifications] Resend failed ({r.status_code}): {r.text}. Trying SMTP fallback...")
        except Exception as e:
            logger.error(f"[Notifications] Resend error: {e}. Trying SMTP fallback...")

    # 2. SMTP Fallback
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    if not smtp_user or not smtp_password:
        logger.warning("[Notifications] SMTP configuration missing. Cannot send fallback email.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"ExpenseTracker <{smtp_from}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        context = smtplib.ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, to_email, msg.as_string())
        logger.info(f"[Notifications] Fallback email sent via SMTP to {to_email}")
    except Exception as e:
        logger.error(f"[Notifications] Fallback SMTP failed to send email to {to_email}: {e}")


def send_email_notification(to_email: str, subject: str, html_content: str):
    """Dispatches email notification in background thread so request never blocks."""
    threading.Thread(target=_sync_send_email, args=(to_email, subject, html_content), daemon=True).start()


# ─── Budget Alert Check ────────────────────────────────────────────────────────

def check_and_notify_budget(db: Session, user: User, expense: Expense):
    """
    Checks if current month/week spent vs budget limit crosses 80% or 100% threshold.
    Dispatches alerts via Telegram and Email, and stores logs to avoid spam.
    """
    today = date.today()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    year_month = today.strftime("%Y-%m")
    year_week = today.strftime("%Y-w%W")

    # Fetch all budgets for this user
    budgets = db.query(Budget).filter(Budget.user_id == user.id).all()
    if not budgets:
        return

    # Fetch current month's expenses
    expenses = db.query(Expense).filter(
        Expense.user_id == user.id,
        Expense.is_deleted == False,
        Expense.date >= month_start,
        Expense.date <= today
    ).all()

    for budget in budgets:
        # 1. Calculate Spent
        if budget.category_id is not None:
            if expense.category_id != budget.category_id:
                continue
            m_spent = sum(e.amount for e in expenses if e.category_id == budget.category_id)
            w_spent = sum(e.amount for e in expenses if e.category_id == budget.category_id and e.date >= week_start)
            cat_name = budget.category.name if budget.category else "Unknown"
            scope_label = f"*{cat_name}* category"
            email_scope_label = f"'{cat_name}' Category"
        else:
            m_spent = sum(e.amount for e in expenses)
            w_spent = sum(e.amount for e in expenses if e.date >= week_start)
            scope_label = "your *Global* budget"
            email_scope_label = "Global Budget"

        # 2. Check Monthly Limit
        if budget.monthly_limit and budget.monthly_limit > 0:
            m_ratio = m_spent / budget.monthly_limit
            m_pct = int(m_ratio * 100)
            
            for limit_pct in [100, 80]:
                if m_pct >= limit_pct:
                    alert_key = f"budget_alert_{budget.id}_{limit_pct}_monthly_{year_month}"
                    # Check if already logged this month
                    already_sent = db.query(AuditLog).filter(
                        AuditLog.user_id == user.id,
                        AuditLog.entity_type == "budget_alert",
                        AuditLog.detail == alert_key
                    ).first()

                    if not already_sent:
                        subject = f"⚠️ Budget Alert: {email_scope_label} reached {m_pct}%"
                        if limit_pct == 100:
                            emoji = "🚨"
                            status_text = f"exceeded (spent **₹{m_spent:g}** of **₹{budget.monthly_limit:g}**)"
                            email_status_text = f"exceeded (spent <strong>₹{m_spent:g}</strong> of <strong>₹{budget.monthly_limit:g}</strong>)"
                        else:
                            emoji = "⚠️"
                            status_text = f"reached **{m_pct}%** (spent **₹{m_spent:g}** of **₹{budget.monthly_limit:g}**)"
                            email_status_text = f"reached <strong>{m_pct}%</strong> (spent <strong>₹{m_spent:g}</strong> of <strong>₹{budget.monthly_limit:g}</strong>)"

                        # Telegram Msg
                        tg_msg = (
                            f"{emoji} *Monthly Budget Alert!*\n\n"
                            f"You have {status_text} for {scope_label}.\n"
                            f"Remaining: ₹{max(0.0, budget.monthly_limit - m_spent):g}"
                        )
                        if user.telegram_chat_id:
                            send_telegram_notification(user.telegram_chat_id, tg_msg)

                        # Email Msg
                        email_html = f"""
                        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                          <h2 style="color:#e11d48;margin-top:0;">{emoji} Monthly Budget Alert</h2>
                          <p>You have {email_status_text} for your {email_scope_label}.</p>
                          <p><strong>Remaining Budget:</strong> ₹{max(0.0, budget.monthly_limit - m_spent):g}</p>
                          <br/>
                          <p style="font-size:12px;color:#64748b;">This is an automated notification from ExpenseTracker.</p>
                        </div>
                        """
                        send_email_notification(user.email, subject, email_html)

                        # Save to AuditLog to prevent repeat
                        db.add(AuditLog(
                            user_id=user.id,
                            action=AuditActionEnum.added,
                            entity_type="budget_alert",
                            entity_id=budget.id,
                            detail=alert_key
                        ))
                        db.commit()
                        break # Only send one alert per check

        # 3. Check Weekly Limit
        if budget.weekly_limit and budget.weekly_limit > 0:
            w_ratio = w_spent / budget.weekly_limit
            w_pct = int(w_ratio * 100)

            for limit_pct in [100, 80]:
                if w_pct >= limit_pct:
                    alert_key = f"budget_alert_{budget.id}_{limit_pct}_weekly_{year_week}"
                    # Check if already logged this week
                    already_sent = db.query(AuditLog).filter(
                        AuditLog.user_id == user.id,
                        AuditLog.entity_type == "budget_alert",
                        AuditLog.detail == alert_key
                    ).first()

                    if not already_sent:
                        subject = f"⚠️ Weekly Budget Alert: {email_scope_label} reached {w_pct}%"
                        if limit_pct == 100:
                            emoji = "🚨"
                            status_text = f"exceeded (spent **₹{w_spent:g}** of **₹{budget.weekly_limit:g}**)"
                            email_status_text = f"exceeded (spent <strong>₹{w_spent:g}</strong> of <strong>₹{budget.weekly_limit:g}</strong>)"
                        else:
                            emoji = "⚠️"
                            status_text = f"reached **{w_pct}%** (spent **₹{w_spent:g}** of **₹{budget.weekly_limit:g}**)"
                            email_status_text = f"reached <strong>{w_pct}%</strong> (spent <strong>₹{w_spent:g}</strong> of <strong>₹{budget.weekly_limit:g}</strong>)"

                        # Telegram Msg
                        tg_msg = (
                            f"{emoji} *Weekly Budget Alert!*\n\n"
                            f"You have {status_text} for {scope_label}.\n"
                            f"Remaining: ₹{max(0.0, budget.weekly_limit - w_spent):g}"
                        )
                        if user.telegram_chat_id:
                            send_telegram_notification(user.telegram_chat_id, tg_msg)

                        # Email Msg
                        email_html = f"""
                        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                          <h2 style="color:#e11d48;margin-top:0;">{emoji} Weekly Budget Alert</h2>
                          <p>You have {email_status_text} for your {email_scope_label}.</p>
                          <p><strong>Remaining Budget:</strong> ₹{max(0.0, budget.weekly_limit - w_spent):g}</p>
                          <br/>
                          <p style="font-size:12px;color:#64748b;">This is an automated notification from ExpenseTracker.</p>
                        </div>
                        """
                        send_email_notification(user.email, subject, email_html)

                        # Save to AuditLog
                        db.add(AuditLog(
                            user_id=user.id,
                            action=AuditActionEnum.added,
                            entity_type="budget_alert",
                            entity_id=budget.id,
                            detail=alert_key
                        ))
                        db.commit()
                        break


# ─── Due Reminders & Recurring Processing ───────────────────────────────────────

def get_next_renewal_date(start_date: date, billing_cycle: str, today: date) -> date:
    """Helper to compute the next renewal date for a subscription."""
    if start_date > today:
        return start_date
    cycle = (billing_cycle or "monthly").lower()

    current_date = start_date
    while current_date <= today:
        if cycle == "daily":
            current_date += timedelta(days=1)
        elif cycle == "weekly":
            current_date += timedelta(weeks=1)
        elif cycle == "monthly":
            try:
                # Add exactly 1 month
                current_date = current_date.replace(year=current_date.year + (current_date.month // 12),
                                                    month=(current_date.month % 12) + 1)
            except ValueError:
                # Handle end of month day overflows
                current_date += timedelta(days=30)
        elif cycle == "yearly":
            try:
                current_date = current_date.replace(year=current_date.year + 1)
            except ValueError:
                current_date = current_date.replace(year=current_date.year + 1, day=28)
        else:
            current_date += timedelta(days=30)
    return current_date


def process_due_reminders_and_recurring(db: Session) -> dict:
    """
    Iterates through all users to:
    1. Process active due recurring transactions (auto-create Expense, advance next_due date, notify).
    2. Collect and dispatch reminders, EMIs, and Subscriptions due within 3 days.
    """
    today = date.today()
    results = {"recurring": 0, "reminders_sent": 0}

    # Fetch all users
    users = db.query(User).all()
    for user in users:
        # 1. Process Recurring Transactions
        due_txns = db.query(RecurringTransaction).filter(
            RecurringTransaction.user_id == user.id,
            RecurringTransaction.is_active == True,
            RecurringTransaction.next_due <= today
        ).all()

        for txn in due_txns:
            # Auto-create Expense
            expense = Expense(
                user_id=user.id,
                category_id=txn.category_id,
                title=txn.title,
                amount=txn.amount,
                date=today,
                payment_method="upi", # default to upi
                note="Auto-logged via Recurring Transaction scheduler",
                source="recurring"
            )
            db.add(expense)

            # Advance next_due date
            old_due = txn.next_due
            if txn.frequency == FrequencyEnum.weekly:
                txn.next_due = old_due + timedelta(weeks=1)
            else: # Monthly
                try:
                    txn.next_due = old_due.replace(year=old_due.year + (old_due.month // 12),
                                                   month=(old_due.month % 12) + 1)
                except ValueError:
                    txn.next_due = old_due + timedelta(days=30)

            db.commit()

            # Trigger Budget check for this auto-logged expense
            check_and_notify_budget(db, user, expense)

            # Notify user
            subject = f"🔄 Recurring Transaction Logged: {txn.title}"
            tg_msg = (
                f"🔄 *Recurring Expense Logged!*\n\n"
                f"📝 *{txn.title}* — ₹{txn.amount:g}\n"
                f"📅 Automatically logged today ({today.strftime('%d %b %Y')}).\n"
                f"⏱️ Next cycle due on: {txn.next_due.strftime('%d %b %Y')}"
            )
            if user.telegram_chat_id:
                send_telegram_notification(user.telegram_chat_id, tg_msg)

            email_html = f"""
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
              <h2 style="color:#0f766e;margin-top:0;">🔄 Recurring Expense Automatically Logged</h2>
              <p>Your recurring transaction for <strong>{txn.title}</strong> of <strong>₹{txn.amount:g}</strong> has been automatically logged today.</p>
              <p>Next cycle date: {txn.next_due.strftime('%d %b %Y')}</p>
              <br/>
              <p style="font-size:12px;color:#64748b;">This is an automated notification from ExpenseTracker.</p>
            </div>
            """
            send_email_notification(user.email, subject, email_html)
            results["recurring"] += 1

        # 2. Check Upcoming Reminders, EMIs, and Subscriptions due in 3 days
        three_days_later = today + timedelta(days=3)

        # A. Reminders
        active_reminders = db.query(Reminder).filter(
            Reminder.user_id == user.id,
            Reminder.is_done == False,
            Reminder.remind_at >= datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc),
            Reminder.remind_at <= datetime.combine(three_days_later, datetime.max.time(), tzinfo=timezone.utc)
        ).all()

        # B. EMIs
        upcoming_emis = db.query(EMI).filter(
            EMI.user_id == user.id,
            EMI.payment_due_date >= today,
            EMI.payment_due_date <= three_days_later
        ).all()

        # C. Subscriptions
        active_subs = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.is_active == True
        ).all()
        due_subs = []
        for sub in active_subs:
            next_renewal = get_next_renewal_date(sub.start_date, sub.billing_cycle, today)
            if today <= next_renewal <= three_days_later:
                due_subs.append((sub, next_renewal))

        # Send alert if there are any upcoming items
        if active_reminders or upcoming_emis or due_subs:
            tg_lines = ["⏰ *Upcoming Bills & Reminders Alert!* \n"]
            email_lines = ["<h2>⏰ Upcoming Bills & Reminders</h2>"]

            if active_reminders:
                tg_lines.append("\n*Pending Reminders:*")
                email_lines.append("<h3>Pending Reminders:</h3><ul>")
                for r in active_reminders:
                    rem_dt_str = r.remind_at.strftime('%d %b %Y %H:%M')
                    tg_lines.append(f"• `{r.title}` (Due: {rem_dt_str})")
                    email_lines.append(f"<li><strong>{r.title}</strong> - Due: {rem_dt_str}</li>")
                email_lines.append("</ul>")

            if upcoming_emis:
                tg_lines.append("\n*Upcoming EMIs:*")
                email_lines.append("<h3>Upcoming EMIs:</h3><ul>")
                for e in upcoming_emis:
                    due_str = e.payment_due_date.strftime('%d %b %Y')
                    tg_lines.append(f"• `{e.title}` — ₹{e.emi_amount:g} (Due: {due_str})")
                    email_lines.append(f"<li><strong>{e.title}</strong> — ₹{e.emi_amount:g} - Due: {due_str}</li>")
                email_lines.append("</ul>")

            if due_subs:
                tg_lines.append("\n*Renewing Subscriptions:*")
                email_lines.append("<h3>Renewing Subscriptions:</h3><ul>")
                for sub, next_renewal in due_subs:
                    due_str = next_renewal.strftime('%d %b %Y')
                    tg_lines.append(f"• `{sub.name}` — ₹{sub.amount:g} (Renews: {due_str})")
                    email_lines.append(f"<li><strong>{sub.name}</strong> — ₹{sub.amount:g} - Renews: {due_str}</li>")
                email_lines.append("</ul>")

            # Dispatch alerts
            tg_msg = "\n".join(tg_lines)
            if user.telegram_chat_id:
                send_telegram_notification(user.telegram_chat_id, tg_msg)

            email_subject = "⏰ ExpenseTracker Checklist: Upcoming Bills & Subscriptions"
            email_html = f"""
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
              {"".join(email_lines)}
              <br/>
              <p style="font-size:12px;color:#64748b;">This is an automated notification from ExpenseTracker.</p>
            </div>
            """
            send_email_notification(user.email, email_subject, email_html)
            results["reminders_sent"] += 1

    return results
