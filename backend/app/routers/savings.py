from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Saving, AuditLog, User
from app.schemas import SavingCreate, SavingUpdate, SavingOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/savings", tags=["Savings"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="saving", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[SavingOut])
def get_savings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Saving).filter(Saving.user_id == current_user.id).order_by(Saving.date.desc()).all()


@router.post("/", response_model=SavingOut, status_code=201)
def create_saving(payload: SavingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    saving = Saving(user_id=current_user.id, **payload.model_dump())
    db.add(saving)
    db.commit()
    db.refresh(saving)
    log_action(db, current_user.id, "added", saving.id, f"Logged savings '{saving.title}' ₹{saving.amount}")
    db.commit()
    return saving


@router.put("/{saving_id}", response_model=SavingOut)
def update_saving(saving_id: int, payload: SavingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    saving = db.query(Saving).filter(Saving.id == saving_id, Saving.user_id == current_user.id).first()
    if not saving:
        raise HTTPException(404, "Savings record not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(saving, k, v)
    db.commit()
    db.refresh(saving)
    log_action(db, current_user.id, "edited", saving.id, f"Edited savings '{saving.title}' ₹{saving.amount}")
    db.commit()
    return saving


@router.delete("/{saving_id}", status_code=204)
def delete_saving(saving_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    saving = db.query(Saving).filter(Saving.id == saving_id, Saving.user_id == current_user.id).first()
    if not saving:
        raise HTTPException(404, "Savings record not found")
    log_action(db, current_user.id, "deleted", saving.id, f"Deleted savings '{saving.title}' ₹{saving.amount}")
    db.delete(saving)
    db.commit()
