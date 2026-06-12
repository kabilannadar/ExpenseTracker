from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import date
import os, shutil, uuid

from app.database import get_db
from app.models import Expense, AuditLog, User
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


def log_action(db, user_id, action, entity_id, detail):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="expense", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[ExpenseOut])
def get_expenses(
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Expense).filter(Expense.user_id == current_user.id, Expense.is_deleted == False)
    if q:
        query = query.filter(Expense.title.ilike(f"%{q}%"))
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if payment_method:
        query = query.filter(Expense.payment_method == payment_method)
    if date_from:
        query = query.filter(Expense.date >= date_from)
    if date_to:
        query = query.filter(Expense.date <= date_to)
    return query.order_by(Expense.date.desc()).all()


@router.post("/", response_model=ExpenseOut, status_code=201)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expense = Expense(user_id=current_user.id, **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    log_action(db, current_user.id, "added", expense.id, f"Added '{expense.title}' ₹{expense.amount}")
    db.commit()
    return expense


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id, Expense.is_deleted == False).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(expense, k, v)
    db.commit()
    db.refresh(expense)
    log_action(db, current_user.id, "edited", expense.id, f"Edited '{expense.title}' ₹{expense.amount}")
    db.commit()
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    log_action(db, current_user.id, "deleted", expense.id, f"Deleted '{expense.title}' ₹{expense.amount}")
    expense.is_deleted = True
    db.commit()


@router.post("/{expense_id}/attachment")
async def upload_attachment(expense_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    expense.attachment_path = f"/uploads/{filename}"
    db.commit()
    return {"attachment_path": expense.attachment_path}
