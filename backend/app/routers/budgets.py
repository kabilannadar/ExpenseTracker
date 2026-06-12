from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta

from app.database import get_db
from app.models import Budget, AuditLog, User, Expense
from app.schemas import BudgetCreate, BudgetUpdate, BudgetOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="budget", entity_id=entity_id, detail=detail))


def calculate_spent_for_budgets(db: Session, user_id: int, budgets: List[Budget]):
    today = date.today()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    # Fetch this month's expenses
    expenses = db.query(Expense).filter(
        Expense.user_id == user_id,
        Expense.is_deleted == False,
        Expense.date >= month_start,
        Expense.date <= today
    ).all()

    for budget in budgets:
        if budget.category_id is not None:
            m_spent = sum(e.amount for e in expenses if e.category_id == budget.category_id)
            w_spent = sum(e.amount for e in expenses if e.category_id == budget.category_id and e.date >= week_start)
        else:
            m_spent = sum(e.amount for e in expenses)
            w_spent = sum(e.amount for e in expenses if e.date >= week_start)
        
        budget.monthly_spent = m_spent
        budget.weekly_spent = w_spent


@router.get("/", response_model=List[BudgetOut])
def get_budgets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    calculate_spent_for_budgets(db, current_user.id, budgets)
    return budgets


@router.post("/", response_model=BudgetOut, status_code=201)
def create_budget(payload: BudgetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if budget already exists for this category/global
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == payload.category_id
    ).first()
    if existing:
        raise HTTPException(400, "Budget already exists for this category/global")

    budget = Budget(user_id=current_user.id, **payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)

    # Calculate spent amounts for response mapping
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    calculate_spent_for_budgets(db, current_user.id, budgets)

    limit_str = f"monthly: ₹{budget.monthly_limit}" if budget.monthly_limit else f"weekly: ₹{budget.weekly_limit}"
    log_action(db, current_user.id, "added", budget.id, f"Set Budget ({limit_str})")
    db.commit()
    return budget


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: int, payload: BudgetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(404, "Budget not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(budget, k, v)
    db.commit()
    db.refresh(budget)

    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    calculate_spent_for_budgets(db, current_user.id, budgets)

    limit_str = f"monthly: ₹{budget.monthly_limit}" if budget.monthly_limit else f"weekly: ₹{budget.weekly_limit}"
    log_action(db, current_user.id, "edited", budget.id, f"Edited Budget ({limit_str})")
    db.commit()
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(404, "Budget not found")
    limit_str = f"monthly: ₹{budget.monthly_limit}" if budget.monthly_limit else f"weekly: ₹{budget.weekly_limit}"
    log_action(db, current_user.id, "deleted", budget.id, f"Deleted Budget ({limit_str})")
    db.delete(budget)
    db.commit()
