from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Subscription, AuditLog, User
from app.schemas import SubscriptionCreate, SubscriptionUpdate, SubscriptionOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="subscription", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[SubscriptionOut])
def get_subscriptions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Subscription).filter(Subscription.user_id == current_user.id).all()


@router.post("/", response_model=SubscriptionOut, status_code=201)
def create_subscription(payload: SubscriptionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = Subscription(user_id=current_user.id, **payload.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    log_action(db, current_user.id, "added", sub.id, f"Added Subscription '{sub.name}' (Amount: ₹{sub.amount})")
    db.commit()
    return sub


@router.put("/{sub_id}", response_model=SubscriptionOut)
def update_subscription(sub_id: int, payload: SubscriptionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id, Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(sub, k, v)
    db.commit()
    db.refresh(sub)
    log_action(db, current_user.id, "edited", sub.id, f"Edited Subscription '{sub.name}' (Amount: ₹{sub.amount}, Active: {sub.is_active})")
    db.commit()
    return sub


@router.delete("/{sub_id}", status_code=204)
def delete_subscription(sub_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id, Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    log_action(db, current_user.id, "deleted", sub.id, f"Deleted Subscription '{sub.name}'")
    db.delete(sub)
    db.commit()
