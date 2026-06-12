from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import EMI, AuditLog, User
from app.schemas import EMICreate, EMIUpdate, EMIOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/emis", tags=["EMIs"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="emi", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[EMIOut])
def get_emis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(EMI).filter(EMI.user_id == current_user.id).order_by(EMI.payment_due_date.asc()).all()


@router.post("/", response_model=EMIOut, status_code=201)
def create_emi(payload: EMICreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emi = EMI(user_id=current_user.id, **payload.model_dump())
    db.add(emi)
    db.commit()
    db.refresh(emi)
    log_action(db, current_user.id, "added", emi.id, f"Added EMI '{emi.title}' (Principal: ₹{emi.principal_amount}, EMI: ₹{emi.emi_amount})")
    db.commit()
    return emi


@router.put("/{emi_id}", response_model=EMIOut)
def update_emi(emi_id: int, payload: EMIUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emi = db.query(EMI).filter(EMI.id == emi_id, EMI.user_id == current_user.id).first()
    if not emi:
        raise HTTPException(404, "EMI not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(emi, k, v)
    db.commit()
    db.refresh(emi)
    log_action(db, current_user.id, "edited", emi.id, f"Edited EMI '{emi.title}' (EMI: ₹{emi.emi_amount})")
    db.commit()
    return emi


@router.delete("/{emi_id}", status_code=204)
def delete_emi(emi_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emi = db.query(EMI).filter(EMI.id == emi_id, EMI.user_id == current_user.id).first()
    if not emi:
        raise HTTPException(404, "EMI not found")
    log_action(db, current_user.id, "deleted", emi.id, f"Deleted EMI '{emi.title}' (EMI: ₹{emi.emi_amount})")
    db.delete(emi)
    db.commit()
