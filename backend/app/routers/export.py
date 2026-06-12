from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta
from typing import Optional
import io
import pandas as pd
from fastapi.responses import StreamingResponse

from app.database import get_db
from app.models import Expense, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/export", tags=["Export"])


def get_filtered_expenses(db, user_id, date_filter, date_from, date_to):
    query = db.query(Expense).filter(Expense.user_id == user_id, Expense.is_deleted == False)
    today = date.today()
    if date_filter == "today":
        query = query.filter(Expense.date == today)
    elif date_filter == "this_week":
        start = today - timedelta(days=today.weekday())
        query = query.filter(Expense.date >= start, Expense.date <= today)
    elif date_filter == "this_month":
        query = query.filter(extract("month", Expense.date) == today.month, extract("year", Expense.date) == today.year)
    elif date_filter == "custom" and date_from and date_to:
        query = query.filter(Expense.date >= date_from, Expense.date <= date_to)
    return query.all()


@router.get("/csv")
def export_csv(
    date_filter: str = "this_month",
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expenses = get_filtered_expenses(db, current_user.id, date_filter, date_from, date_to)
    data = [{
        "Date": e.date, "Title": e.title, "Amount": e.amount,
        "Category": e.category.name if e.category else "Uncategorized",
        "Payment Method": e.payment_method, "Note": e.note or ""
    } for e in expenses]
    df = pd.DataFrame(data)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=expenses.csv"})


@router.get("/excel")
def export_excel(
    date_filter: str = "this_month",
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expenses = get_filtered_expenses(db, current_user.id, date_filter, date_from, date_to)
    data = [{
        "Date": str(e.date), "Title": e.title, "Amount": e.amount,
        "Category": e.category.name if e.category else "Uncategorized",
        "Payment Method": e.payment_method, "Note": e.note or ""
    } for e in expenses]
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Expenses")
    output.seek(0)
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=expenses.xlsx"})
