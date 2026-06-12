from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta
from collections import defaultdict

from app.database import get_db
from app.models import Expense, Income, Budget, User
from app.schemas import DashboardStats, ExpenseOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    # Monthly expenses
    monthly_expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.is_deleted == False,
        Expense.date >= month_start,
        Expense.date <= today,
    ).all()

    total_expenses_month = sum(e.amount for e in monthly_expenses)

    # Weekly expenses
    weekly_expenses_list = [e for e in monthly_expenses if e.date >= week_start]
    weekly_expenses = sum(e.amount for e in weekly_expenses_list)

    # Monthly income
    monthly_income = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id,
        Income.date >= month_start,
        Income.date <= today,
    ).scalar() or 0.0

    net_savings = monthly_income - total_expenses_month

    # Budgets
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    global_budget = next((b for b in budgets if b.category_id is None), None)
    global_budget_spent = total_expenses_month if global_budget else 0.0

    monthly_budget = global_budget.monthly_limit if global_budget else None
    budget_remaining = (monthly_budget - global_budget_spent) if monthly_budget else None

    # Calculate total expense over budget (sum of global budget exceedance and category budget exceedances)
    total_expense_over_budget = 0.0
    if global_budget and global_budget.monthly_limit:
        if total_expenses_month > global_budget.monthly_limit:
            total_expense_over_budget += (total_expenses_month - global_budget.monthly_limit)
            
    for b in budgets:
        if b.category_id is not None and b.monthly_limit:
            cat_spent = sum(e.amount for e in monthly_expenses if e.category_id == b.category_id)
            if cat_spent > b.monthly_limit:
                total_expense_over_budget += (cat_spent - b.monthly_limit)

    # Largest expense this month
    largest = max((e.amount for e in monthly_expenses), default=None)

    # Spending streak (consecutive days with expenses)
    all_expense_dates = set(
        e.date for e in db.query(Expense).filter(
            Expense.user_id == current_user.id,
            Expense.is_deleted == False
        ).all()
    )
    streak = 0
    check_date = today
    while check_date in all_expense_dates:
        streak += 1
        check_date -= timedelta(days=1)

    # Category breakdown (pie chart)
    cat_totals = defaultdict(float)
    cat_names = {}
    cat_colors = {}
    for e in monthly_expenses:
        cat_id = e.category_id or 0
        cat_totals[cat_id] += e.amount
        if e.category:
            cat_names[cat_id] = e.category.name
            cat_colors[cat_id] = e.category.color
        else:
            cat_names[cat_id] = "Uncategorized"
            cat_colors[cat_id] = "#6b7280"

    category_breakdown = sorted([
        {"category_id": k, "name": cat_names[k], "color": cat_colors[k], "amount": v}
        for k, v in cat_totals.items()
    ], key=lambda x: x["amount"], reverse=True)

    top_categories = category_breakdown[:5]

    # Monthly trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        ref = today.replace(day=1) - timedelta(days=i * 28)
        ref = ref.replace(day=1)
        month_end = (ref.replace(month=ref.month % 12 + 1, day=1) - timedelta(days=1)) if ref.month < 12 else ref.replace(month=12, day=31)
        total = db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id,
            Expense.is_deleted == False,
            Expense.date >= ref,
            Expense.date <= month_end,
        ).scalar() or 0.0
        monthly_trend.append({"month": ref.strftime("%b %Y"), "amount": total})

    # Recent expenses
    recent = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.is_deleted == False
    ).order_by(Expense.date.desc()).limit(5).all()

    return DashboardStats(
        total_expenses_month=total_expenses_month,
        total_income_month=monthly_income,
        net_savings=net_savings,
        weekly_expenses=weekly_expenses,
        monthly_budget=monthly_budget,
        budget_remaining=budget_remaining,
        global_budget_spent=global_budget_spent,
        total_expense_over_budget=total_expense_over_budget,
        spending_streak=streak,
        largest_expense=largest,
        top_categories=top_categories,
        recent_expenses=recent,
        monthly_trend=monthly_trend,
        category_breakdown=category_breakdown,
    )
