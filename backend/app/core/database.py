"""MongoDB connection. MongoDB is optional: the app still works without it.

The client is created on first use. If the server is not running, callers
get DatabaseUnavailable and show a clear message instead of crashing.

Every database call goes through `database_operation`, so any driver or
socket failure becomes DatabaseUnavailable (HTTP 503). The real error is
logged with credentials removed; it is never returned to the client.
"""

import logging
import re
from contextlib import contextmanager
from typing import Iterator, Optional

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from app.core.config import settings

FORMS_COLLECTION = "forms"

NOT_REACHABLE_MESSAGE = "MongoDB is not reachable. Start the MongoDB server to save or resume forms."
STOPPED_MESSAGE = "MongoDB stopped responding. Your changes were not saved; try again shortly."

logger = logging.getLogger("formease.database")

# Matches the user:password part of a mongodb:// or mongodb+srv:// URI.
_URI_CREDENTIALS = re.compile(r"(mongodb(?:\+srv)?://)[^/\s@]*@")


class DatabaseUnavailable(Exception):
    """MongoDB cannot be reached or an operation failed."""


_client: Optional[MongoClient] = None


def safe_error_summary(exc: BaseException) -> str:
    """Short, credential-free text describing an error, for the server log only."""
    text = _URI_CREDENTIALS.sub(r"\1***@", str(exc))
    return text[:200]


def _log_failure(action: str, exc: BaseException) -> None:
    # Log the exception type and a redacted message. Full tracebacks are not
    # logged because driver tracebacks can echo connection details.
    logger.error("MongoDB %s failed (%s): %s", action, type(exc).__name__, safe_error_summary(exc))


@contextmanager
def database_operation(action: str) -> Iterator[None]:
    """Turn any database or socket failure inside the block into DatabaseUnavailable."""
    try:
        yield
    except DatabaseUnavailable:
        raise
    except (PyMongoError, OSError) as exc:
        _log_failure(action, exc)
        raise DatabaseUnavailable(STOPPED_MESSAGE) from None


def _get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=2000)
    return _client


def forms_collection() -> Collection:
    """Return the forms collection, or raise DatabaseUnavailable."""
    try:
        db = _get_client()[settings.mongodb_db_name]
        db.command("ping")
        return db[FORMS_COLLECTION]
    except (PyMongoError, OSError) as exc:
        _log_failure("connect", exc)
        raise DatabaseUnavailable(NOT_REACHABLE_MESSAGE) from None


def check_database() -> dict:
    """Used by /api/database/status. Returns availability without secrets."""
    try:
        forms_collection()
        return {"available": True, "message": "MongoDB is connected."}
    except DatabaseUnavailable as exc:
        return {"available": False, "message": str(exc)}
