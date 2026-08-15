from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os
import shutil

from app.database import get_db
from app.models import User, AuditLog
from app.schemas import UserOut, UserUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="user", entity_id=entity_id, detail=detail))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    updated_fields = ", ".join(payload.model_dump(exclude_unset=True).keys())
    log_action(db, current_user.id, "edited", current_user.id, f"Updated profile/settings: {updated_fields}")
    db.commit()
    return current_user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Save the file
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"avatar_{current_user.id}_{int(db.query(User).count())}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user avatar URL
    current_user.avatar_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    
    log_action(db, current_user.id, "edited", current_user.id, "Updated profile picture")
    db.commit()
    
    return current_user
