from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import RecurringTransaction, AuditLog, User
from app.schemas import RecurringCreate, RecurringUpdate, RecurringOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/recurring", tags=["Recurring"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="recurring", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[RecurringOut])
def get_recurring(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(RecurringTransaction).filter(RecurringTransaction.user_id == current_user.id).all()


@router.post("/", response_model=RecurringOut, status_code=201)
def create_recurring(payload: RecurringCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txn = RecurringTransaction(user_id=current_user.id, **payload.model_dump())
    db.add(txn)
    db.commit()
    db.refresh(txn)
    log_action(db, current_user.id, "added", txn.id, f"Added Recurring Transaction '{txn.title}' (Amount: ₹{txn.amount}, {txn.frequency})")
    db.commit()
    return txn


@router.put("/{txn_id}", response_model=RecurringOut)
def update_recurring(txn_id: int, payload: RecurringUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txn = db.query(RecurringTransaction).filter(RecurringTransaction.id == txn_id, RecurringTransaction.user_id == current_user.id).first()
    if not txn:
        raise HTTPException(404, "Recurring transaction not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(txn, k, v)
    db.commit()
    db.refresh(txn)
    log_action(db, current_user.id, "edited", txn.id, f"Edited Recurring Transaction '{txn.title}' (Amount: ₹{txn.amount}, Active: {txn.is_active})")
    db.commit()
    return txn


@router.delete("/{txn_id}", status_code=204)
def delete_recurring(txn_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txn = db.query(RecurringTransaction).filter(RecurringTransaction.id == txn_id, RecurringTransaction.user_id == current_user.id).first()
    if not txn:
        raise HTTPException(404, "Recurring transaction not found")
    log_action(db, current_user.id, "deleted", txn.id, f"Deleted Recurring Transaction '{txn.title}'")
    db.delete(txn)
    db.commit()
