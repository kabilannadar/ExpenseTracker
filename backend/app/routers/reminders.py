from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Reminder, AuditLog, User
from app.schemas import ReminderCreate, ReminderUpdate, ReminderOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="reminder", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[ReminderOut])
def get_reminders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Reminder).filter(Reminder.user_id == current_user.id).order_by(Reminder.remind_at).all()


@router.post("/", response_model=ReminderOut, status_code=201)
def create_reminder(payload: ReminderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reminder = Reminder(user_id=current_user.id, **payload.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    log_action(db, current_user.id, "added", reminder.id, f"Added Reminder '{reminder.title}' at {reminder.remind_at}")
    db.commit()
    return reminder


@router.put("/{reminder_id}", response_model=ReminderOut)
def update_reminder(reminder_id: int, payload: ReminderUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(reminder, k, v)
    db.commit()
    db.refresh(reminder)
    log_action(db, current_user.id, "edited", reminder.id, f"Edited Reminder '{reminder.title}' - Done: {reminder.is_done}")
    db.commit()
    return reminder


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    log_action(db, current_user.id, "deleted", reminder.id, f"Deleted Reminder '{reminder.title}'")
    db.delete(reminder)
    db.commit()
