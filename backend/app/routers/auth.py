from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import smtplib, ssl, secrets, os, time
from datetime import datetime, timedelta
from collections import defaultdict
from threading import Lock
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.database import get_db
from app.models import User, Category, EmailVerification
from app.schemas import UserRegister, UserLogin, Token, UserOut, GoogleLoginRequest, SendOTPRequest, RegisterWithOTPRequest
from app.auth import hash_password, verify_password, create_access_token, verify_google_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# ─── OTP Rate Limiting ────────────────────────────────────────────────────────
# Simple in-memory cooldown: one OTP per email per 60 seconds.
# This resets on server restart, which is fine for free-tier single-instance deployments.
_otp_last_sent: dict[str, float] = defaultdict(float)
_otp_lock = Lock()
OTP_COOLDOWN_SECONDS = 60

DEFAULT_CATEGORIES = [
    {"name": "Outside Food", "color": "#f97316", "icon": "utensils"},
    {"name": "Home Food", "color": "#22c55e", "icon": "home"},
    {"name": "Household Items", "color": "#8b5cf6", "icon": "shopping-bag"},
    {"name": "Transport", "color": "#3b82f6", "icon": "car"},
    {"name": "Shopping", "color": "#ec4899", "icon": "shopping-cart"},
    {"name": "Bills", "color": "#f59e0b", "icon": "file-text"},
    {"name": "Health", "color": "#10b981", "icon": "heart"},
    {"name": "Petrol", "color": "#ef4444", "icon": "fuel"},
    {"name": "Medicines", "color": "#06b6d4", "icon": "pill"},
    {"name": "Rent", "color": "#64748b", "icon": "key"},
    {"name": "Entertainment", "color": "#a855f7", "icon": "tv"},
    {"name": "Other", "color": "#6b7280", "icon": "tag"},
]

DEFAULT_INCOME_CATEGORIES = [
    {"name": "Salary", "color": "#10b981", "icon": "trending-up", "type": "income"},
    {"name": "Freelancing", "color": "#3b82f6", "icon": "briefcase", "type": "income"},
    {"name": "Gifts", "color": "#f59e0b", "icon": "gift", "type": "income"},
    {"name": "Other", "color": "#6b7280", "icon": "coins", "type": "income"},
]


def seed_default_categories(db: Session, user_id: int):
    """Seed default expense and income categories for a new user."""
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_id, is_default=True, **cat))
    for cat in DEFAULT_INCOME_CATEGORIES:
        db.add(Category(user_id=user_id, is_default=True, **cat))
    db.commit()


# ─── Email OTP Helper ─────────────────────────────────────────────────────────

def send_otp_email(to_email: str, otp: str):
    """Send a 6-digit OTP email using SMTP credentials from .env."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    if not smtp_user or not smtp_password:
        # Development mode: just print the OTP to server console
        print(f"[OTP] SMTP not configured. Code for {to_email}: {otp}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your ExpenseTracker Verification Code"
    msg["From"] = f"ExpenseTracker <{smtp_from}>"
    msg["To"] = to_email

    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f11;color:#e2e8f0;border-radius:16px;border:1px solid #2d2d3a;">
      <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#fff;">Verify your email</h2>
      <p style="color:#94a3b8;margin:0 0 28px;">Enter this code in ExpenseTracker to complete your registration:</p>
      <div style="background:#1e1e2e;border:1px solid #3d3d52;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
        <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#818cf8;">{otp}</span>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <hr style="border:none;border-top:1px solid #2d2d3a;margin:24px 0;" />
      <p style="color:#64748b;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """

    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, to_email, msg.as_string())


# ─── Google Sign-In (Primary Auth) ───────────────────────────────────────────

@router.post("/google-login", response_model=UserOut)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Verify Google access token via userinfo endpoint, find-or-create user, return JWT."""
    idinfo = verify_google_token(payload.token)
    if not idinfo:
        raise HTTPException(status_code=400, detail="Invalid or expired Google token.")

    email = idinfo.get("email", "").lower().strip()
    email_verified = idinfo.get("email_verified", True)

    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Google profile.")

    if not email_verified:
        raise HTTPException(status_code=400, detail="Your Google email is not verified.")

    name = idinfo.get("name", "") or email.split("@")[0]
    avatar_url = idinfo.get("picture", "")

    user = db.query(User).filter(User.email == email).first()
    is_new = False

    if not user:
        is_new = True
        user = User(
            name=name,
            email=email,
            avatar_url=avatar_url,
            password_hash="google_auth_" + secrets.token_hex(16)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        seed_default_categories(db, user.id)
    else:
        if name:
            user.name = name
        if avatar_url:
            user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    print(f"[auth] Google login: user_id={user.id}, email={email}, new={is_new}")

    return {
        "id": user.id, "name": user.name, "email": user.email,
        "currency": user.currency, "timezone": user.timezone,
        "dark_mode": user.dark_mode,
        "avatar_url": user.avatar_url, "created_at": user.created_at,
        "access_token": token,
    }


# ─── Email/Password Auth with OTP Verification ───────────────────────────────

@router.post("/send-otp")
def send_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):
    """
    Send a 6-digit OTP to the given email for registration verification.
    Replaces any previous unused OTP for that email.
    Rate-limited to one request per 60 seconds per email address.
    """
    email = payload.email.lower().strip()

    # ── Rate limiting ──
    with _otp_lock:
        now = time.monotonic()
        last_sent = _otp_last_sent[email]
        if now - last_sent < OTP_COOLDOWN_SECONDS:
            remaining = int(OTP_COOLDOWN_SECONDS - (now - last_sent))
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting another code."
            )
        _otp_last_sent[email] = now

    # Reject if email is already registered
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This email is already registered. Please sign in instead."
        )

    # Invalidate old OTPs for this email
    db.query(EmailVerification).filter(EmailVerification.email == email).delete()

    otp = str(secrets.randbelow(1000000)).zfill(6)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    db.add(EmailVerification(email=email, otp=otp, expires_at=expires_at))
    db.commit()

    try:
        send_otp_email(email, otp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"message": "Verification code sent. Check your inbox (and spam folder.)"}


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterWithOTPRequest, db: Session = Depends(get_db)):
    """Register a new user after verifying their email OTP."""
    email = payload.email.lower().strip()

    # Verify OTP
    verification = db.query(EmailVerification).filter(
        EmailVerification.email == email,
        EmailVerification.otp == payload.otp,
        EmailVerification.used == False,
        EmailVerification.expires_at > datetime.utcnow(),
    ).first()

    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    # Double-check email not taken
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered. Please sign in.")

    # Mark OTP as used
    verification.used = True

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.commit()  # commit OTP used flag

    seed_default_categories(db, user.id)

    token = create_access_token(data={"sub": str(user.id)})
    print(f"[auth] Email registration: user_id={user.id}, email={email}")

    return {
        "id": user.id, "name": user.name, "email": user.email,
        "currency": user.currency, "timezone": user.timezone,
        "dark_mode": user.dark_mode,
        "avatar_url": user.avatar_url, "created_at": user.created_at,
        "access_token": token,
    }


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Email + password login for users who registered via email."""
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/debug-db")
def debug_db(secret: str, db: Session = Depends(get_db)):
    """
    Debug endpoint — lists registered users.
    Protected by the DEBUG_SECRET environment variable.
    Set DEBUG_SECRET in your .env to enable this endpoint.
    """
    debug_secret = os.getenv("DEBUG_SECRET", "")
    if not debug_secret or secret != debug_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "password_hash_prefix": u.password_hash[:12] if u.password_hash else "None"
        }
        for u in users
    ]

