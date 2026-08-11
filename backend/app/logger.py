"""
Centralized structured logger for ExpenseTracker.

Produces one log line per event:
  2026-08-10T17:00:00Z | ERROR | req=abc123 | user=42 | GET /api/expenses | message here

Works on Render/Railway/any host that captures stdout.
"""

import logging
import sys
import os
from datetime import datetime, timezone


class StructuredFormatter(logging.Formatter):
    """
    Formats log records as a pipe-delimited structured string.
    Fields: timestamp | level | request_id | user_id | endpoint | message [| exc_info]
    """

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        level = record.levelname.ljust(8)
        req_id = getattr(record, "request_id", "-")
        user_id = getattr(record, "user_id", "-")
        endpoint = getattr(record, "endpoint", "-")

        parts = [ts, level, f"req={req_id}", f"user={user_id}", endpoint, record.getMessage()]

        if record.exc_info:
            parts.append(self.formatException(record.exc_info))

        return " | ".join(parts)


def _build_logger() -> logging.Logger:
    logger = logging.getLogger("expense_tracker")

    if logger.handlers:
        # Already configured — avoid adding duplicate handlers on reload
        return logger

    logger.setLevel(logging.DEBUG if os.getenv("DEBUG", "").lower() in ("1", "true") else logging.INFO)

    # Always log to stdout (captured by Render, Railway, Docker, etc.)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)

    # Optional: rotating file log — only created if LOG_FILE env var is set
    log_file = os.getenv("LOG_FILE")
    if log_file:
        from logging.handlers import RotatingFileHandler
        fh = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
        fh.setFormatter(StructuredFormatter())
        logger.addHandler(fh)

    logger.propagate = False
    return logger


logger = _build_logger()


def get_logger() -> logging.Logger:
    """Return the singleton app logger."""
    return logger
