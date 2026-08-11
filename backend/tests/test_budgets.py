"""
test_budgets.py — tests for /api/budgets endpoints.

Covers:
- Basic CRUD
- Cross-user authorization (User A must not touch User B's budgets)
- Duplicate budget rejection
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Budget
from tests.conftest import _make_user, _auth_headers


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _create_budget_for(db: Session, user_id: int, monthly_limit: float = 5000.0) -> Budget:
    """Insert a global budget (no category) directly into the DB."""
    budget = Budget(user_id=user_id, monthly_limit=monthly_limit)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


# ─── CRUD ─────────────────────────────────────────────────────────────────────

class TestBudgetCRUD:
    def test_get_budgets_empty(self, client: TestClient, headers_a):
        """New user should get an empty list."""
        resp = client.get("/api/budgets/", headers=headers_a)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_global_budget(self, client: TestClient, headers_a):
        """Creating a global budget (no category) should return 201."""
        resp = client.post("/api/budgets/", headers=headers_a, json={
            "monthly_limit": 10000.0,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["monthly_limit"] == 10000.0
        assert data["category_id"] is None

    def test_create_duplicate_global_budget_rejected(self, client: TestClient, db: Session, user_a, headers_a):
        """Creating a second global budget for the same user should return 400."""
        _create_budget_for(db, user_a.id)
        resp = client.post("/api/budgets/", headers=headers_a, json={
            "monthly_limit": 9999.0,
        })
        assert resp.status_code == 400

    def test_update_own_budget(self, client: TestClient, db: Session, user_a, headers_a):
        """User can update their own budget's limit."""
        budget = _create_budget_for(db, user_a.id, monthly_limit=3000.0)
        resp = client.put(f"/api/budgets/{budget.id}", headers=headers_a, json={
            "monthly_limit": 8000.0,
        })
        assert resp.status_code == 200
        assert resp.json()["monthly_limit"] == 8000.0

    def test_delete_own_budget(self, client: TestClient, db: Session, user_a, headers_a):
        """User can delete their own budget."""
        budget = _create_budget_for(db, user_a.id)
        resp = client.delete(f"/api/budgets/{budget.id}", headers=headers_a)
        assert resp.status_code == 204

        # Should be gone
        list_resp = client.get("/api/budgets/", headers=headers_a)
        assert list_resp.json() == []

    def test_unauthenticated_access_denied(self, client: TestClient):
        """No token → 401."""
        resp = client.get("/api/budgets/")
        assert resp.status_code == 401

    def test_budget_has_spent_fields(self, client: TestClient, db: Session, user_a, headers_a):
        """Budget response should include monthly_spent and weekly_spent fields."""
        _create_budget_for(db, user_a.id)
        resp = client.get("/api/budgets/", headers=headers_a)
        assert resp.status_code == 200
        budget = resp.json()[0]
        assert "monthly_spent" in budget
        assert "weekly_spent" in budget


# ─── Cross-user authorization (security) ─────────────────────────────────────

class TestBudgetAuthorization:
    """User A must not be able to update or delete User B's budgets."""

    def test_user_a_cannot_update_user_b_budget(
        self, client: TestClient, db: Session, user_b, headers_a
    ):
        """User A updating User B's budget must get 404."""
        budget = _create_budget_for(db, user_b.id)
        resp = client.put(f"/api/budgets/{budget.id}", headers=headers_a, json={
            "monthly_limit": 1.0,
        })
        assert resp.status_code == 404

    def test_user_a_cannot_delete_user_b_budget(
        self, client: TestClient, db: Session, user_b, headers_a
    ):
        """User A deleting User B's budget must get 404."""
        budget = _create_budget_for(db, user_b.id)
        resp = client.delete(f"/api/budgets/{budget.id}", headers=headers_a)
        assert resp.status_code == 404

    def test_user_a_budgets_not_in_user_b_list(
        self, client: TestClient, db: Session, user_a, user_b, headers_b
    ):
        """User B's budget list must not include User A's budgets."""
        _create_budget_for(db, user_a.id, monthly_limit=99999.0)
        resp = client.get("/api/budgets/", headers=headers_b)
        assert resp.status_code == 200
        limits = [b["monthly_limit"] for b in resp.json()]
        assert 99999.0 not in limits
