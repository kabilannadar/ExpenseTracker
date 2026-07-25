from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date, datetime
import os, shutil, uuid, csv, io

from app.database import get_db
from app.models import Expense, AuditLog, User, Category
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


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8")
    except UnicodeDecodeError:
        try:
            decoded = contents.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not decode the CSV file. Please make sure it is in UTF-8 or Latin-1 format.")
            
    f = io.StringIO(decoded)
    reader = csv.DictReader(f)
    
    fieldnames = reader.fieldnames
    if not fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no headers.")
        
    normalized_headers = {name.lower().strip().replace(" ", "_"): name for name in fieldnames}
    
    required = ["date", "title", "amount"]
    missing = [r for r in required if r not in normalized_headers]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns in CSV: {', '.join(missing)}")
        
    date_col = normalized_headers["date"]
    title_col = normalized_headers["title"]
    amount_col = normalized_headers["amount"]
    category_col = normalized_headers.get("category")
    payment_method_col = normalized_headers.get("payment_method") or normalized_headers.get("payment_method".replace("_", " "))
    note_col = normalized_headers.get("note")
    
    user_categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    category_map = {cat.name.lower().strip(): cat for cat in user_categories}
    
    imported_count = 0
    expenses_to_add = []
    
    for row_idx, row in enumerate(reader, start=1):
        date_val = row.get(date_col)
        title_val = row.get(title_col)
        amount_val = row.get(amount_col)
        category_val = row.get(category_col) if category_col else "Other"
        payment_method_val = row.get(payment_method_col) if payment_method_col else "cash"
        note_val = row.get(note_col) or ""
        
        if not date_val or not title_val or not amount_val:
            continue
            
        try:
            amount = float(str(amount_val).replace(",", "").strip())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Row {row_idx}: Invalid amount value '{amount_val}'.")
            
        parsed_date = None
        for fmt_str in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
            try:
                parsed_date = datetime.strptime(date_val.strip(), fmt_str).date()
                break
            except ValueError:
                continue
        if not parsed_date:
            raise HTTPException(status_code=400, detail=f"Row {row_idx}: Invalid date value '{date_val}'. Supported formats include YYYY-MM-DD.")
            
        category_name = category_val.strip()
        cat_key = category_name.lower()
        if not cat_key:
            cat_key = "other"
            category_name = "Other"
            
        if cat_key in category_map:
            cat_obj = category_map[cat_key]
        else:
            cat_obj = Category(
                user_id=current_user.id,
                name=category_name,
                type="expense",
                color="#6366f1",
                icon="tag"
            )
            db.add(cat_obj)
            db.commit()
            db.refresh(cat_obj)
            category_map[cat_key] = cat_obj
            
        expense = Expense(
            user_id=current_user.id,
            category_id=cat_obj.id,
            title=title_val.strip(),
            amount=amount,
            date=parsed_date,
            payment_method=payment_method_val.strip() if payment_method_val else "cash",
            note=note_val.strip() if note_val else None,
            is_deleted=False
        )
        expenses_to_add.append(expense)
        imported_count += 1
        
    if expenses_to_add:
        db.add_all(expenses_to_add)
        db.commit()
        log_action(db, current_user.id, "added", None, f"Imported {imported_count} expenses from CSV file")
        db.commit()
        
    return {"message": f"Successfully imported {imported_count} expenses.", "count": imported_count}
