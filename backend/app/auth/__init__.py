from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from app.database import get_db
from app.models import User

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# ─── Startup validation ─────────────────────────────────────────────────────────────
_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if not SECRET_KEY:
    if _ENVIRONMENT != "development":
        raise RuntimeError(
            "SECRET_KEY environment variable is not set. "
            "Set a strong random value in your .env or hosting dashboard."
        )
    # Development fallback — safe locally, never reaches production
    SECRET_KEY = "dev-only-insecure-fallback-key-do-not-use-in-production"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_google_token(token: str) -> dict | None:
    """
    Verify a Google token. Supports:
    1. Google OAuth2 access_token → calls /oauth2/v3/userinfo
    2. Google ID token (JWT) → verifies with google-auth library
    3. Dev fallback: unverified JWT decode
    """
    import httpx

    # 1. Try treating it as an access_token — call Google userinfo endpoint
    try:
        resp = httpx.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if resp.status_code == 200:
            idinfo = resp.json()
            if "email" in idinfo:
                print("[auth] Google token verified via userinfo endpoint.")
                return idinfo
    except Exception as e:
        print(f"[auth] userinfo endpoint call failed: {e}")

    # 2. Try treating it as an ID token (JWT) — official google-auth verification
    if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID.strip():
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                GOOGLE_CLIENT_ID.strip()
            )
            return idinfo
        except Exception as e:
            print(f"[auth] Google ID token validation failed: {e}")

    return None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user
