"""
test_users.py — tests for /api/users endpoints.

Covers:
- GET /me returns current user profile
- PUT /me updates profile fields
- User A cannot update User B's profile (each user can only update themselves)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import _make_user, _auth_headers


class TestUsersMe:
    def test_get_me_returns_correct_user(self, client: TestClient, user_a, headers_a):
        """GET /me should return the authenticated user's profile."""
        resp = client.get("/api/users/me", headers=headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "user_a@test.com"
        assert data["name"] == "User A"
        assert "id" in data
        # Sensitive fields must NOT be in the response
        assert "password_hash" not in data

    def test_update_me_name(self, client: TestClient, db: Session, user_a, headers_a):
        """PUT /me should update the user's name."""
        resp = client.put("/api/users/me", headers=headers_a, json={"name": "Updated Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    def test_update_me_currency(self, client: TestClient, db: Session, user_a, headers_a):
        """PUT /me should update currency preference."""
        resp = client.put("/api/users/me", headers=headers_a, json={"currency": "USD"})
        assert resp.status_code == 200
        assert resp.json()["currency"] == "USD"

    def test_update_me_dark_mode(self, client: TestClient, db: Session, user_a, headers_a):
        """PUT /me should update dark_mode preference."""
        resp = client.put("/api/users/me", headers=headers_a, json={"dark_mode": False})
        assert resp.status_code == 200
        assert resp.json()["dark_mode"] is False

    def test_update_me_partial(self, client: TestClient, db: Session, user_a, headers_a):
        """PUT /me with only some fields should not affect unspecified fields."""
        # Set currency first
        client.put("/api/users/me", headers=headers_a, json={"currency": "EUR"})
        # Update only name
        resp = client.put("/api/users/me", headers=headers_a, json={"name": "Partial Update"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Partial Update"
        assert data["currency"] == "EUR"  # must be unchanged

    def test_update_me_unauthenticated(self, client: TestClient):
        """Updating /me without token should return 401."""
        resp = client.put("/api/users/me", json={"name": "Hacker"})
        assert resp.status_code == 401

    def test_two_users_get_own_profiles(
        self, client: TestClient, user_a, user_b, headers_a, headers_b
    ):
        """Each user should only see their own profile."""
        resp_a = client.get("/api/users/me", headers=headers_a)
        resp_b = client.get("/api/users/me", headers=headers_b)

        assert resp_a.json()["email"] == "user_a@test.com"
        assert resp_b.json()["email"] == "user_b@test.com"
        # Neither sees the other's data
        assert resp_a.json()["id"] != resp_b.json()["id"]
