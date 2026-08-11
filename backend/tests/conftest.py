"""
conftest.py — shared pytest fixtures for ExpenseTracker test suite.

Strategy:
- Use an in-memory SQLite database (no file, no cleanup needed).
- Each test gets a fresh DB session that rolls back after the test.
- The FastAPI app has its get_db dependency overridden to use the test session.
- Helper fixtures create users and return auth headers without hitting email/OTP.
"""

import pytest
import secrets
from datetime import datetime, timedelta
from typing import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Use the app's Base so all tables are created
from app.database import Base, get_db
from app.main import app
from app.models import User, Category, EmailVerification
from app.auth import hash_password, create_access_token

# ─── In-memory test database ──────────────────────────────────────────────────

TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once for the whole test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    """
    Yields a DB session and rolls back after each test so tests are isolated.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db: Session) -> TestClient:
    """
    FastAPI TestClient with the test DB injected via dependency_overrides.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ─── User / auth helpers ──────────────────────────────────────────────────────

def _make_user(db: Session, email: str, name: str = "Test User") -> User:
    """Create a user directly in the DB (bypasses OTP flow)."""
    user = User(
        name=name,
        email=email,
        password_hash=hash_password("TestPass@123"),
    )
    db.add(user)
    db.flush()

    # Seed minimal default categories so routes that need them work
    for cat_data in [
        {"name": "Other", "type": "expense", "color": "#6b7280", "icon": "tag", "is_default": True},
        {"name": "Salary", "type": "income",  "color": "#10b981", "icon": "trending-up", "is_default": True},
    ]:
        db.add(Category(user_id=user.id, **cat_data))

    db.commit()
    db.refresh(user)
    return user


def _auth_headers(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user_a(db: Session) -> User:
    return _make_user(db, "user_a@test.com", "User A")


@pytest.fixture()
def user_b(db: Session) -> User:
    return _make_user(db, "user_b@test.com", "User B")


@pytest.fixture()
def headers_a(user_a: User) -> dict:
    return _auth_headers(user_a)


@pytest.fixture()
def headers_b(user_b: User) -> dict:
    return _auth_headers(user_b)
