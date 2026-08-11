"""
test_expenses.py — tests for /api/expenses endpoints.

The most important tests here are the cross-user authorization checks:
  - User A must NOT be able to read, update, or delete User B's expenses.
  - These return 404 (not 403) to avoid leaking the existence of resources.
"""

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Expense
from tests.conftest import _make_user, _auth_headers


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _create_expense_for(db: Session, user_id: int, title: str = "Coffee", amount: float = 50.0) -> Expense:
    """Insert an expense directly into the DB for a given user."""
    expense = Expense(
        user_id=user_id,
        title=title,
        amount=amount,
        date=date.today(),
        payment_method="upi",
        is_deleted=False,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


# ─── CRUD ─────────────────────────────────────────────────────────────────────

class TestExpenseCRUD:
    def test_get_expenses_empty(self, client: TestClient, headers_a):
        """New user should get an empty list."""
        resp = client.get("/api/expenses/", headers=headers_a)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_expense(self, client: TestClient, headers_a):
        """Creating an expense should return 201 with the created data."""
        resp = client.post("/api/expenses/", headers=headers_a, json={
            "title": "Lunch",
            "amount": 120.0,
            "date": str(date.today()),
            "payment_method": "cash",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Lunch"
        assert data["amount"] == 120.0

    def test_create_expense_missing_required_field(self, client: TestClient, headers_a):
        """Missing 'amount' should return 422."""
        resp = client.post("/api/expenses/", headers=headers_a, json={
            "title": "No amount",
            "date": str(date.today()),
        })
        assert resp.status_code == 422

    def test_get_own_expenses(self, client: TestClient, db: Session, user_a, headers_a):
        """User should only see their own expenses."""
        _create_expense_for(db, user_a.id, "My Expense")
        resp = client.get("/api/expenses/", headers=headers_a)
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.json()]
        assert "My Expense" in titles

    def test_update_own_expense(self, client: TestClient, db: Session, user_a, headers_a):
        """User can update their own expense."""
        expense = _create_expense_for(db, user_a.id, "Old Title")
        resp = client.put(f"/api/expenses/{expense.id}", headers=headers_a, json={
            "title": "New Title",
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Title"

    def test_delete_own_expense(self, client: TestClient, db: Session, user_a, headers_a):
        """User can delete their own expense (soft delete)."""
        expense = _create_expense_for(db, user_a.id, "To Delete")
        resp = client.delete(f"/api/expenses/{expense.id}", headers=headers_a)
        assert resp.status_code == 204

        # Should no longer appear in list
        list_resp = client.get("/api/expenses/", headers=headers_a)
        titles = [e["title"] for e in list_resp.json()]
        assert "To Delete" not in titles

    def test_unauthenticated_access_denied(self, client: TestClient):
        """No token → 401."""
        resp = client.get("/api/expenses/")
        assert resp.status_code == 401


# ─── Cross-user authorization (security) ─────────────────────────────────────

class TestExpenseAuthorization:
    """
    These tests verify that User A cannot access User B's resources.
    The router filters by user_id AND id, so the result is a 404 (not a 403)
    which avoids leaking the existence of the resource.
    """

    def test_user_a_cannot_see_user_b_expenses(
        self, client: TestClient, db: Session, user_a, user_b, headers_a
    ):
        """User A's expense list must not contain User B's expenses."""
        _create_expense_for(db, user_b.id, "User B Secret Expense")
        resp = client.get("/api/expenses/", headers=headers_a)
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.json()]
        assert "User B Secret Expense" not in titles

    def test_user_a_cannot_update_user_b_expense(
        self, client: TestClient, db: Session, user_b, headers_a
    ):
        """User A trying to update User B's expense must get 404."""
        expense = _create_expense_for(db, user_b.id, "B's Expense")
        resp = client.put(f"/api/expenses/{expense.id}", headers=headers_a, json={
            "title": "Hijacked!",
        })
        assert resp.status_code == 404

    def test_user_a_cannot_delete_user_b_expense(
        self, client: TestClient, db: Session, user_b, headers_a
    ):
        """User A trying to delete User B's expense must get 404."""
        expense = _create_expense_for(db, user_b.id, "B's Expense to Protect")
        resp = client.delete(f"/api/expenses/{expense.id}", headers=headers_a)
        assert resp.status_code == 404

    def test_user_a_cannot_upload_attachment_to_user_b_expense(
        self, client: TestClient, db: Session, user_b, headers_a
    ):
        """User A trying to upload attachment to User B's expense must get 404."""
        expense = _create_expense_for(db, user_b.id, "B's Expense")
        import io
        fake_file = io.BytesIO(b"fake image data")
        resp = client.post(
            f"/api/expenses/{expense.id}/attachment",
            headers=headers_a,
            files={"file": ("test.jpg", fake_file, "image/jpeg")},
        )
        assert resp.status_code == 404

    def test_nonexistent_expense_returns_404(self, client: TestClient, headers_a):
        """Accessing an expense that doesn't exist should return 404."""
        resp = client.put("/api/expenses/999999", headers=headers_a, json={"title": "Ghost"})
        assert resp.status_code == 404
