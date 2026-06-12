from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Goal, AuditLog, User
from app.schemas import GoalCreate, GoalUpdate, GoalOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/goals", tags=["Goals"])


def log_action(db: Session, user_id: int, action: str, entity_id: int, detail: str):
    db.add(AuditLog(user_id=user_id, action=action, entity_type="goal", entity_id=entity_id, detail=detail))


@router.get("/", response_model=List[GoalOut])
def get_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    for g in goals:
        g.progress = round((g.saved_amount / g.target_amount) * 100, 1) if g.target_amount > 0 else 0
    return goals


@router.post("/", response_model=GoalOut, status_code=201)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = Goal(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    goal.progress = round((goal.saved_amount / goal.target_amount) * 100, 1) if goal.target_amount > 0 else 0
    log_action(db, current_user.id, "added", goal.id, f"Created Goal '{goal.title}' (Target: ₹{goal.target_amount})")
    db.commit()
    return goal


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, payload: GoalUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    goal.progress = round((goal.saved_amount / goal.target_amount) * 100, 1) if goal.target_amount > 0 else 0
    log_action(db, current_user.id, "edited", goal.id, f"Edited Goal '{goal.title}' (Saved: ₹{goal.saved_amount} / Target: ₹{goal.target_amount})")
    db.commit()
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    log_action(db, current_user.id, "deleted", goal.id, f"Deleted Goal '{goal.title}'")
    db.delete(goal)
    db.commit()
