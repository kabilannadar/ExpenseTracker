from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])


@router.get("/", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
