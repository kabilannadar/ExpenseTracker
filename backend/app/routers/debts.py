from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Debt, AuditLog, User
from app.schemas import DebtCreate, DebtUpdate, DebtOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/debts", tags=["Debts"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="debt", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[DebtOut])
def get_debts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Debt).filter(Debt.user_id == current_user.id).order_by(Debt.created_at.desc()).all()


@router.post("/", response_model=DebtOut, status_code=201)
def create_debt(payload: DebtCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    debt = Debt(user_id=current_user.id, **payload.model_dump())
    # Auto-set is_paid if remaining balance is 0 or less
    if debt.remaining_amount <= 0:
        debt.is_paid = True
    db.add(debt)
    db.commit()
    db.refresh(debt)
    log_action(db, current_user.id, "added", debt.id, f"Added Debt to '{debt.creditor}' of ₹{debt.amount}")
    db.commit()
    return debt


@router.put("/{debt_id}", response_model=DebtOut)
def update_debt(debt_id: int, payload: DebtUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    debt = db.query(Debt).filter(Debt.id == debt_id, Debt.user_id == current_user.id).first()
    if not debt:
        raise HTTPException(404, "Debt record not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(debt, k, v)
    
    # Auto-adjust is_paid status based on remaining amount
    if debt.remaining_amount <= 0:
        debt.is_paid = True
    else:
        # If remaining amount was updated to be positive but is_paid wasn't updated, reset is_paid
        if payload.remaining_amount is not None and payload.is_paid is None:
            debt.is_paid = False

    db.commit()
    db.refresh(debt)
    log_action(db, current_user.id, "edited", debt.id, f"Edited Debt to '{debt.creditor}' (Remaining: ₹{debt.remaining_amount})")
    db.commit()
    return debt


@router.delete("/{debt_id}", status_code=204)
def delete_debt(debt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    debt = db.query(Debt).filter(Debt.id == debt_id, Debt.user_id == current_user.id).first()
    if not debt:
        raise HTTPException(404, "Debt record not found")
    log_action(db, current_user.id, "deleted", debt.id, f"Deleted Debt to '{debt.creditor}'")
    db.delete(debt)
    db.commit()
