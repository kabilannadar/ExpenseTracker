from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import smtplib, ssl, os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.database import get_db
from app.models import Feedback, User
from app.schemas import FeedbackCreate, FeedbackOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

def send_feedback_email(user_email: str, user_name: str, subject: str, message: str, rating: int):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    
    # Send feedback to ADMIN_EMAIL or fall back to smtp_user
    admin_email = os.getenv("ADMIN_EMAIL", smtp_user)
    if not admin_email:
        print("[Feedback Email] Admin email not configured. Suppressing email.")
        return

    if not smtp_user or not smtp_password:
        print(f"[Feedback Email] SMTP not configured. Feedback from {user_name} ({user_email}):\nSubject: {subject}\nRating: {rating}/5\nMessage: {message}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"New ExpenseTracker Feedback: {subject}"
    msg["From"] = f"ExpenseTracker Support <{smtp_from}>"
    msg["To"] = admin_email

    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0f0f11;color:#e2e8f0;border-radius:16px;border:1px solid #2d2d3a;">
      <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#fff;">New Support/Feedback Concern</h2>
      <div style="background:#1e1e2e;border:1px solid #3d3d52;border-radius:12px;padding:20px;margin-bottom:20px;color:#e2e8f0;">
        <p style="margin:0 0 8px;"><strong>From User:</strong> {user_name} ({user_email})</p>
        <p style="margin:0 0 8px;"><strong>Subject:</strong> {subject}</p>
        <p style="margin:0 0 8px;"><strong>Rating:</strong> {f"{rating} / 5" if rating else "Not Rated"}</p>
        <hr style="border:none;border-top:1px solid #3d3d52;margin:12px 0;" />
        <p style="margin:0;white-space:pre-wrap;"><strong>Message/Concern:</strong><br/>{message}</p>
      </div>
      <p style="color:#64748b;font-size:12px;margin:0;">This is an automated notification from ExpenseTracker.</p>
    </div>
    """

    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, admin_email, msg.as_string())
    except Exception as e:
        print(f"[Feedback Email] Error sending email: {e}")

@router.post("/", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    feedback = Feedback(
        user_id=current_user.id,
        subject=payload.subject,
        message=payload.message,
        rating=payload.rating
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    # Send email notification asynchronously/synchronously in route
    send_feedback_email(
        user_email=current_user.email,
        user_name=current_user.name,
        subject=feedback.subject,
        message=feedback.message,
        rating=feedback.rating
    )
    
    return feedback
