import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.notifications import process_due_reminders_and_recurring

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cron", tags=["Cron Scheduler"])

@router.post("/process", status_code=status.HTTP_200_OK)
def trigger_cron_process(
    secret: str = Query(None, description="Secret token to authorize the cron trigger"),
    x_cron_secret: str = Header(None, description="Secret token to authorize the cron trigger"),
    db: Session = Depends(get_db)
):
    """
    Endpoint to trigger the daily financial processing tasks:
    1. Processes due recurring transactions (auto-logging expenses and advancing cycle dates).
    2. Scans for upcoming reminders, EMIs, and Subscriptions due in 3 days, and dispatches alerts via Telegram/Email.
    """
    configured_secret = os.getenv("CRON_SECRET", "default_cron_secret")
    provided_secret = secret or x_cron_secret

    if not provided_secret or provided_secret != configured_secret:
        logger.warning(f"[Cron] Unauthorized cron trigger attempt from {provided_secret}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized. Invalid or missing secret token."
        )

    logger.info("[Cron] Running scheduled daily billing and alert processing...")
    try:
        stats = process_due_reminders_and_recurring(db)
        return {
            "status": "success",
            "message": "Daily billing and reminder notifications processed successfully.",
            "processed": stats
        }
    except Exception as e:
        logger.error(f"[Cron] Process failed with exception: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process alerts: {str(e)}"
        )
