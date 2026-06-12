from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserRegister, UserLogin, Token, UserOut
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])

DEFAULT_CATEGORIES = [
    {"name": "Outside Food", "color": "#f97316", "icon": "utensils"},
    {"name": "Home Food", "color": "#22c55e", "icon": "home"},
    {"name": "Household Items", "color": "#8b5cf6", "icon": "shopping-bag"},
    {"name": "Transport", "color": "#3b82f6", "icon": "car"},
    {"name": "Shopping", "color": "#ec4899", "icon": "shopping-cart"},
    {"name": "Bills", "color": "#f59e0b", "icon": "file-text"},
    {"name": "Health", "color": "#10b981", "icon": "heart"},
    {"name": "Petrol", "color": "#ef4444", "icon": "fuel"},
    {"name": "Medicines", "color": "#06b6d4", "icon": "pill"},
    {"name": "Rent", "color": "#64748b", "icon": "key"},
    {"name": "Entertainment", "color": "#a855f7", "icon": "tv"},
    {"name": "Other", "color": "#6b7280", "icon": "tag"},
]


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed default categories for the new user
    from app.models import Category
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user.id, is_default=True, **cat))
    db.commit()

    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}
