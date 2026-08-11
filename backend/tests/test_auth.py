"""
test_auth.py — tests for authentication endpoints.

Covers:
- OTP send + register flow
- Login (success and wrong password)
- JWT-protected /me endpoint (authenticated and unauthenticated)
"""

import secrets
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User, EmailVerification
from app.auth import hash_password, create_access_token
from tests.conftest import _make_user, _auth_headers


# ─── OTP + Registration ───────────────────────────────────────────────────────

class TestRegisterFlow:
    def test_send_otp_new_email(self, client: TestClient, db: Session):
        """Sending OTP to an unregistered email should succeed (200)."""
        resp = client.post("/api/auth/send-otp", json={"email": "newuser@test.com"})
        # SMTP isn't configured in tests; the route prints OTP and returns 200
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data

    def test_send_otp_existing_email(self, client: TestClient, db: Session):
        """Sending OTP to an already-registered email should return 400."""
        _make_user(db, "already@test.com")
        resp = client.post("/api/auth/send-otp", json={"email": "already@test.com"})
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"].lower()

    def test_register_with_valid_otp(self, client: TestClient, db: Session):
        """Full registration with a valid OTP should create the user and return a token."""
        email = "register_test@test.com"
        otp = "123456"
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        db.add(EmailVerification(email=email, otp=otp, expires_at=expires_at))
        db.commit()

        resp = client.post("/api/auth/register", json={
            "name": "Register Test",
            "email": email,
            "password": "StrongPass@1",
            "otp": otp,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == email
        assert "access_token" in data

    def test_register_with_invalid_otp(self, client: TestClient, db: Session):
        """Registration with a wrong OTP should return 400."""
        email = "bad_otp@test.com"
        resp = client.post("/api/auth/register", json={
            "name": "Bad OTP",
            "email": email,
            "password": "StrongPass@1",
            "otp": "000000",
        })
        assert resp.status_code == 400

    def test_register_with_expired_otp(self, client: TestClient, db: Session):
        """Registration with an expired OTP should return 400."""
        email = "expired@test.com"
        otp = "999999"
        expires_at = datetime.utcnow() - timedelta(minutes=1)  # already expired
        db.add(EmailVerification(email=email, otp=otp, expires_at=expires_at))
        db.commit()

        resp = client.post("/api/auth/register", json={
            "name": "Expired",
            "email": email,
            "password": "StrongPass@1",
            "otp": otp,
        })
        assert resp.status_code == 400


# ─── Login ────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_success(self, client: TestClient, db: Session):
        """Valid credentials should return an access token."""
        _make_user(db, "login_ok@test.com")
        resp = client.post("/api/auth/login", json={
            "email": "login_ok@test.com",
            "password": "TestPass@123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, db: Session):
        """Wrong password should return 401."""
        _make_user(db, "wrongpass@test.com")
        resp = client.post("/api/auth/login", json={
            "email": "wrongpass@test.com",
            "password": "WrongPassword!",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        """Login with unknown email should return 401."""
        resp = client.post("/api/auth/login", json={
            "email": "nobody@test.com",
            "password": "Anything@1",
        })
        assert resp.status_code == 401

    def test_login_invalid_email_format(self, client: TestClient):
        """Malformed email should return 422 (validation error)."""
        resp = client.post("/api/auth/login", json={
            "email": "not-an-email",
            "password": "Anything@1",
        })
        assert resp.status_code == 422


# ─── Token / Me endpoint ──────────────────────────────────────────────────────

class TestMeEndpoint:
    def test_get_me_unauthenticated(self, client: TestClient):
        """Accessing /me without a token should return 401."""
        resp = client.get("/api/users/me")
        assert resp.status_code == 401

    def test_get_me_authenticated(self, client: TestClient, db: Session, user_a, headers_a):
        """Authenticated user should get their own profile."""
        resp = client.get("/api/users/me", headers=headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "user_a@test.com"
        assert data["id"] == user_a.id

    def test_get_me_with_invalid_token(self, client: TestClient):
        """Garbage token should return 401."""
        resp = client.get("/api/users/me", headers={"Authorization": "Bearer garbage.token.here"})
        assert resp.status_code == 401

    def test_debug_db_without_secret(self, client: TestClient):
        """debug-db with wrong secret must be denied."""
        resp = client.get("/api/auth/debug-db?secret=wrong")
        assert resp.status_code == 403
