from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AuditLog
from app.schemas import UserOut, UserUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="user", entity_id=entity_id, detail=detail))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    updated_fields = ", ".join(payload.model_dump(exclude_none=True).keys())
    log_action(db, current_user.id, "edited", current_user.id, f"Updated profile/settings: {updated_fields}")
    db.commit()
    return current_user
