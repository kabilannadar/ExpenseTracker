from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Income, AuditLog, User
from app.schemas import IncomeCreate, IncomeUpdate, IncomeOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/income", tags=["Income"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="income", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[IncomeOut])
def get_income(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Income).filter(Income.user_id == current_user.id).order_by(Income.date.desc()).all()


@router.post("/", response_model=IncomeOut, status_code=201)
def create_income(payload: IncomeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inc = Income(user_id=current_user.id, **payload.model_dump())
    db.add(inc)
    db.commit()
    db.refresh(inc)
    log_action(db, current_user.id, "added", inc.id, f"Added Income source '{inc.source}' ₹{inc.amount}")
    db.commit()
    return inc


@router.put("/{income_id}", response_model=IncomeOut)
def update_income(income_id: int, payload: IncomeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inc = db.query(Income).filter(Income.id == income_id, Income.user_id == current_user.id).first()
    if not inc:
        raise HTTPException(404, "Income record not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(inc, k, v)
    db.commit()
    db.refresh(inc)
    log_action(db, current_user.id, "edited", inc.id, f"Edited Income source '{inc.source}' ₹{inc.amount}")
    db.commit()
    return inc


@router.delete("/{income_id}", status_code=204)
def delete_income(income_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inc = db.query(Income).filter(Income.id == income_id, Income.user_id == current_user.id).first()
    if not inc:
        raise HTTPException(404, "Income record not found")
    log_action(db, current_user.id, "deleted", inc.id, f"Deleted Income source '{inc.source}' ₹{inc.amount}")
    db.delete(inc)
    db.commit()
