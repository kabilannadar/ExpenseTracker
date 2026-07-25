from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Income, AuditLog, User, Category, IncomeSourceEnum
from app.schemas import IncomeCreate, IncomeUpdate, IncomeOut
from app.auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/api/income", tags=["Income"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="income", entity_id=entity_id, detail=detail))


def resolve_income_category_and_source(db: Session, user_id: int, category_id: Optional[int], source: Optional[str]):
    cat_id = None
    if category_id:
        cat = db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()
        if cat:
            cat_id = cat.id
    
    if not cat_id and source:
        cat = db.query(Category).filter(
            Category.user_id == user_id,
            Category.type == "income",
            Category.name.ilike(source.strip())
        ).first()
        if cat:
            cat_id = cat.id
        else:
            new_cat = Category(
                user_id=user_id,
                name=source.strip().capitalize(),
                type="income",
                color="#6b7280",
                icon="coins"
            )
            db.add(new_cat)
            db.commit()
            db.refresh(new_cat)
            cat_id = new_cat.id
            
    if not cat_id:
        other_cat = db.query(Category).filter(
            Category.user_id == user_id,
            Category.type == "income",
            Category.name.ilike("other")
        ).first()
        if other_cat:
            cat_id = other_cat.id
        else:
            new_cat = Category(
                user_id=user_id,
                name="Other",
                type="income",
                color="#6b7280",
                icon="coins"
            )
            db.add(new_cat)
            db.commit()
            db.refresh(new_cat)
            cat_id = new_cat.id
            
    cat_obj = db.query(Category).filter(Category.id == cat_id).first()
    cat_name_lower = cat_obj.name.lower() if cat_obj else "other"
    
    source_enum = IncomeSourceEnum.other
    if cat_name_lower in ["salary", "freelancing", "gifts", "other"]:
        source_enum = IncomeSourceEnum(cat_name_lower)
        
    return cat_id, source_enum


@router.get("/", response_model=List[IncomeOut])
def get_income(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Income).filter(Income.user_id == current_user.id).order_by(Income.date.desc()).all()


@router.post("/", response_model=IncomeOut, status_code=201)
def create_income(payload: IncomeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat_id, source_enum = resolve_income_category_and_source(
        db, current_user.id, payload.category_id, payload.source
    )
    
    dump = payload.model_dump()
    dump.pop("category_id", None)
    dump.pop("source", None)
    
    inc = Income(
        user_id=current_user.id,
        category_id=cat_id,
        source=source_enum,
        **dump
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    
    cat_name = inc.category.name if inc.category else "Other"
    log_action(db, current_user.id, "added", inc.id, f"Added Income source '{cat_name}' ₹{inc.amount}")
    db.commit()
    return inc


@router.put("/{income_id}", response_model=IncomeOut)
def update_income(income_id: int, payload: IncomeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inc = db.query(Income).filter(Income.id == income_id, Income.user_id == current_user.id).first()
    if not inc:
        raise HTTPException(404, "Income record not found")
        
    dump = payload.model_dump(exclude_none=True)
    
    if "category_id" in dump or "source" in dump:
        cat_id, source_enum = resolve_income_category_and_source(
            db, 
            current_user.id, 
            dump.get("category_id", inc.category_id), 
            dump.get("source")
        )
        inc.category_id = cat_id
        inc.source = source_enum
        dump.pop("category_id", None)
        dump.pop("source", None)
        
    for k, v in dump.items():
        setattr(inc, k, v)
        
    db.commit()
    db.refresh(inc)
    
    cat_name = inc.category.name if inc.category else "Other"
    log_action(db, current_user.id, "edited", inc.id, f"Edited Income source '{cat_name}' ₹{inc.amount}")
    db.commit()
    return inc


@router.delete("/{income_id}", status_code=204)
def delete_income(income_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inc = db.query(Income).filter(Income.id == income_id, Income.user_id == current_user.id).first()
    if not inc:
        raise HTTPException(404, "Income record not found")
    cat_name = inc.category.name if inc.category else "Other"
    log_action(db, current_user.id, "deleted", inc.id, f"Deleted Income source '{cat_name}' ₹{inc.amount}")
    db.delete(inc)
    db.commit()
