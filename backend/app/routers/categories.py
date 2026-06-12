from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Category, AuditLog, User
from app.schemas import CategoryCreate, CategoryUpdate, CategoryOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["Categories"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="category", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Category).filter(Category.user_id == current_user.id).all()


@router.post("/", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = Category(user_id=current_user.id, **payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    log_action(db, current_user.id, "added", cat.id, f"Created Category '{cat.name}'")
    db.commit()
    return cat


@router.put("/{cat_id}", response_model=CategoryOut)
def update_category(cat_id: int, payload: CategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id, Category.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    log_action(db, current_user.id, "edited", cat.id, f"Edited Category '{cat.name}'")
    db.commit()
    return cat


@router.delete("/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id, Category.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    log_action(db, current_user.id, "deleted", cat.id, f"Deleted Category '{cat.name}'")
    db.delete(cat)
    db.commit()
