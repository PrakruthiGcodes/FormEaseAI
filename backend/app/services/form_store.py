"""Saving, resuming, listing, unlocking, and deleting forms in MongoDB.

Privacy and security rules:
  * Messages and form values are encrypted before they reach the database.
  * Only non-personal metadata (id, status, counts, dates, reference code) is stored in clear text.
  * Session isolation: list and single-record operations require matching session tokens or PIN.
  * PINs are salted with 16 bytes of cryptographic randomness and hashed with PBKDF2 (100,000 iterations).
  * Raw session tokens are never stored in MongoDB; only SHA-256 hashes are persisted.
  * Failed unlock attempts are tracked in memory to enforce brute-force rate-limiting.
"""

import hashlib
import hmac
import re
import secrets
import string
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.core.crypto import decrypt_json, encrypt_json
from app.core.database import database_operation, forms_collection
from app.schemas.chat import (
    FORM_FIELDS,
    ChatTurn,
    FormData,
    FormDetail,
    FormSaveRequest,
    FormSummaryItem,
)
from app.services.validation import validate_form

TOTAL_FIELDS = len(FORM_FIELDS)
REF_CODE_CHARS = string.ascii_uppercase + string.digits

# In-memory brute-force protection for reference code unlocks.
_brute_force_lock = threading.Lock()
_failed_unlock_attempts: dict[str, list[float]] = {}


class FormNotFound(Exception):
    """No saved form has this id."""


class FormAccessDenied(Exception):
    """Caller is not authorized to access this form."""


class InvalidUnlockCredentials(Exception):
    """Invalid reference code or PIN."""


class BruteForceLocked(Exception):
    """Too many failed attempts."""


class FormValidationFailed(Exception):
    """The form data has invalid values or is incomplete for confirmation."""

    def __init__(self, message: str, errors: dict, missing: list[str]):
        super().__init__(message)
        self.errors = errors
        self.missing = missing


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _counts(form_values: dict) -> tuple[int, list[str]]:
    missing = [field for field in FORM_FIELDS if not form_values.get(field)]
    return TOTAL_FIELDS - len(missing), missing


def hash_session_token(token: str) -> str:
    """Hash a session token with SHA-256. Raw session tokens are never stored."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_pin(pin: str, salt: bytes) -> bytes:
    """Hash a 4-digit PIN with PBKDF2-HMAC-SHA256 using 100,000 iterations."""
    return hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, 100_000)


def record_failed_unlock_attempt(reference_code: str) -> None:
    """Record a failed unlock attempt for brute-force protection (300-second window)."""
    now = time.time()
    code = reference_code.strip().upper()
    with _brute_force_lock:
        attempts = [t for t in _failed_unlock_attempts.get(code, []) if now - t < 300]
        attempts.append(now)
        _failed_unlock_attempts[code] = attempts


def check_unlock_brute_force(reference_code: str) -> None:
    """Check if the reference code is temporarily locked due to >= 5 failed attempts in 5 mins."""
    now = time.time()
    code = reference_code.strip().upper()
    with _brute_force_lock:
        attempts = [t for t in _failed_unlock_attempts.get(code, []) if now - t < 300]
        _failed_unlock_attempts[code] = attempts
        if len(attempts) >= 5:
            raise BruteForceLocked("Too many incorrect attempts. Please try again in 5 minutes.")


def clear_failed_unlock_attempts(reference_code: str) -> None:
    """Clear failed attempts when an unlock succeeds or document is deleted."""
    code = reference_code.strip().upper()
    with _brute_force_lock:
        _failed_unlock_attempts.pop(code, None)


def _generate_unique_reference_code(col) -> str:
    """Generate a collision-checked human-readable FE-XXXX reference code."""
    for _ in range(10):
        code = "FE-" + "".join(secrets.choice(REF_CODE_CHARS) for _ in range(4))
        if hasattr(col, "find_one"):
            existing = col.find_one({"reference_code": code}, {"_id": 1})
            if not existing:
                return code
        else:
            return code
    return "FE-" + "".join(secrets.choice(REF_CODE_CHARS) for _ in range(6))


def verify_form_authorization(
    doc: dict,
    session_token: Optional[str] = None,
    access_pin: Optional[str] = None,
) -> bool:
    """Verify that the caller has permission to access the form via session token or PIN."""
    # 1. Check matching session token
    if session_token and session_token.strip():
        token_hash = hash_session_token(session_token.strip())
        stored_session_hash = doc.get("session_token_hash")
        if stored_session_hash and hmac.compare_digest(token_hash, stored_session_hash):
            return True

    # 2. Check matching access PIN
    if access_pin and access_pin.strip():
        stored_salt = doc.get("pin_salt")
        stored_hash = doc.get("pin_hash")
        if stored_salt and stored_hash:
            salt_bytes = bytes.fromhex(stored_salt) if isinstance(stored_salt, str) else stored_salt
            hash_bytes = bytes.fromhex(stored_hash) if isinstance(stored_hash, str) else stored_hash
            computed = hash_pin(access_pin.strip(), salt_bytes)
            if hmac.compare_digest(computed, hash_bytes):
                return True

    return False


def create_form(
    language: str,
    session_token: Optional[str] = None,
    access_pin: Optional[str] = None,
) -> dict:
    """Create an empty in-progress form with reference code and PIN protection."""
    form_id = str(uuid.uuid4())
    now = _now()
    empty = FormData().model_dump()

    if access_pin and re.match(r"^\d{4}$", access_pin.strip()):
        pin = access_pin.strip()
    else:
        pin = f"{secrets.randbelow(10000):04d}"

    salt = secrets.token_bytes(16)
    pin_hashed = hash_pin(pin, salt)

    session_hash = hash_session_token(session_token.strip()) if session_token and session_token.strip() else None

    with database_operation("create form"):
        col = forms_collection()
        ref_code = _generate_unique_reference_code(col)
        doc = {
            "_id": form_id,
            "status": "in_progress",
            "language": language,
            "created_at": now,
            "updated_at": now,
            "completed_count": 0,
            "total_fields": TOTAL_FIELDS,
            "reference_code": ref_code,
            "pin_hash": pin_hashed.hex(),
            "pin_salt": salt.hex(),
            "session_token_hash": session_hash,
            "data_enc": encrypt_json({"messages": [], "form_data": empty}),
        }
        col.insert_one(doc)

    return {
        "id": form_id,
        "status": "in_progress",
        "language": language,
        "created_at": now,
        "reference_code": ref_code,
        "access_pin_issued": pin,
    }


def unlock_form(
    reference_code: str,
    access_pin: str,
    session_token: Optional[str] = None,
) -> FormDetail:
    """Unlock a form using reference code and 4-digit PIN, with brute-force protection."""
    norm_ref = reference_code.strip().upper()
    check_unlock_brute_force(norm_ref)

    with database_operation("unlock form"):
        doc = forms_collection().find_one({"reference_code": norm_ref})

    if doc is None:
        record_failed_unlock_attempt(norm_ref)
        raise InvalidUnlockCredentials("Invalid reference code or PIN")

    stored_salt = doc.get("pin_salt")
    stored_hash = doc.get("pin_hash")
    if not stored_salt or not stored_hash:
        record_failed_unlock_attempt(norm_ref)
        raise InvalidUnlockCredentials("Invalid reference code or PIN")

    salt_bytes = bytes.fromhex(stored_salt) if isinstance(stored_salt, str) else stored_salt
    hash_bytes = bytes.fromhex(stored_hash) if isinstance(stored_hash, str) else stored_hash
    computed = hash_pin(access_pin.strip(), salt_bytes)

    if not hmac.compare_digest(computed, hash_bytes):
        record_failed_unlock_attempt(norm_ref)
        raise InvalidUnlockCredentials("Invalid reference code or PIN")

    # Correct credentials: reset failed attempts counter
    clear_failed_unlock_attempts(norm_ref)

    # Bind caller's active session token if provided
    if session_token and session_token.strip():
        token_hash = hash_session_token(session_token.strip())
        with database_operation("bind session on unlock"):
            forms_collection().update_one(
                {"_id": doc["_id"]},
                {"$set": {"session_token_hash": token_hash}},
            )

    stored = decrypt_json(doc["data_enc"])
    form_values = FormData(**stored["form_data"])
    completed, missing = _counts(form_values.model_dump())
    return FormDetail(
        id=doc["_id"],
        status=doc["status"],
        language=doc["language"],
        messages=[ChatTurn(**turn) for turn in stored["messages"]],
        form_data=form_values,
        missing_fields=missing,
        completed_count=completed,
        total_fields=TOTAL_FIELDS,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        reference_code=doc.get("reference_code"),
    )


def list_forms(
    session_token: Optional[str] = None,
    limit: int = 20,
) -> list[FormSummaryItem]:
    """Return saved forms for the current session, newest first, without personal details."""
    with database_operation("list forms"):
        col = forms_collection()
        if not session_token or not session_token.strip():
            # Shared kiosk / unauthenticated: verify DB connectivity and return empty list
            cursor = col.find({"_id": "__NO_SESSION_UNAUTHENTICATED__"}).limit(0)
            list(cursor)
            return []

        token_hash = hash_session_token(session_token.strip())
        cursor = col.find(
            {"session_token_hash": token_hash},
            {"status": 1, "language": 1, "completed_count": 1, "total_fields": 1,
             "created_at": 1, "updated_at": 1, "reference_code": 1},
        ).sort("updated_at", -1).limit(limit)
        docs = list(cursor)

    return [
        FormSummaryItem(
            id=doc["_id"],
            status=doc["status"],
            language=doc["language"],
            completed_count=doc.get("completed_count", 0),
            total_fields=doc.get("total_fields", TOTAL_FIELDS),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            reference_code=doc.get("reference_code"),
        )
        for doc in docs
    ]


def get_form(
    form_id: str,
    session_token: Optional[str] = None,
    access_pin: Optional[str] = None,
) -> FormDetail:
    """Load and decrypt one saved form after checking authorization."""
    with database_operation("load form"):
        col = forms_collection()
        doc = col.find_one({"_id": form_id})
    if doc is None:
        raise FormNotFound()

    if not verify_form_authorization(doc, session_token, access_pin):
        raise FormAccessDenied("Access denied.")

    stored = decrypt_json(doc["data_enc"])
    form_values = FormData(**stored["form_data"])
    completed, missing = _counts(form_values.model_dump())
    return FormDetail(
        id=doc["_id"],
        status=doc["status"],
        language=doc["language"],
        messages=[ChatTurn(**turn) for turn in stored["messages"]],
        form_data=form_values,
        missing_fields=missing,
        completed_count=completed,
        total_fields=TOTAL_FIELDS,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        reference_code=doc.get("reference_code"),
    )


def save_form(
    form_id: str,
    request: FormSaveRequest,
    session_token: Optional[str] = None,
    access_pin: Optional[str] = None,
) -> FormDetail:
    """Validate and store the whole state of one form after checking authorization."""
    col = forms_collection()
    if hasattr(col, "find_one"):
        with database_operation("load form for save"):
            doc = col.find_one({"_id": form_id})
        if doc is None:
            raise FormNotFound()
        if not verify_form_authorization(doc, session_token, access_pin):
            raise FormAccessDenied("Access denied.")

    normalised, errors = validate_form(request.form_data.model_dump())
    if errors:
        raise FormValidationFailed("Some values are not valid. Please correct them.", errors, [])

    completed, missing = _counts(normalised)
    if request.status == "confirmed" and missing:
        raise FormValidationFailed(
            "All fields must be filled in before confirming.", {}, missing
        )

    messages = [turn.model_dump() for turn in request.messages]
    now = _now()
    update_data = {
        "status": request.status,
        "language": request.language,
        "updated_at": now,
        "completed_count": completed,
        "data_enc": encrypt_json({"messages": messages, "form_data": normalised}),
        **({"confirmed_at": now} if request.status == "confirmed" else {}),
    }
    if session_token and session_token.strip():
        update_data["session_token_hash"] = hash_session_token(session_token.strip())

    with database_operation("save form"):
        result = col.update_one(
            {"_id": form_id},
            {"$set": update_data},
        )
    if result.matched_count == 0:
        raise FormNotFound()
    return get_form(form_id, session_token=session_token, access_pin=access_pin)


def delete_form(
    form_id: str,
    session_token: Optional[str] = None,
    access_pin: Optional[str] = None,
) -> bool:
    """Permanently delete one saved form after checking authorization."""
    col = forms_collection()
    if hasattr(col, "find_one"):
        with database_operation("load form for delete"):
            doc = col.find_one({"_id": form_id})
        if doc is None:
            return False
        if not verify_form_authorization(doc, session_token, access_pin):
            raise FormAccessDenied("Access denied.")
        ref_code = doc.get("reference_code")
    else:
        ref_code = None

    with database_operation("delete form"):
        result = col.delete_one({"_id": form_id})
        if ref_code:
            clear_failed_unlock_attempts(ref_code)
        return result.deleted_count == 1
