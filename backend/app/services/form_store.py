"""Saving, resuming, listing and deleting forms in MongoDB.

Privacy rules:
  * Messages and form values are encrypted before they reach the database.
  * Only non-personal metadata (id, status, counts, dates) is stored in clear text.
  * The list endpoint returns no names or other personal details.
"""

import uuid
from datetime import datetime, timezone

from app.core.crypto import decrypt_json, encrypt_json
from app.core.database import database_operation, forms_collection
from app.schemas.chat import FORM_FIELDS, ChatTurn, FormData, FormDetail, FormSaveRequest, FormSummaryItem
from app.services.validation import validate_form

TOTAL_FIELDS = len(FORM_FIELDS)


class FormNotFound(Exception):
    """No saved form has this id."""


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


def create_form(language: str) -> dict:
    """Create an empty in-progress form and return its metadata."""
    form_id = str(uuid.uuid4())
    now = _now()
    empty = FormData().model_dump()
    doc = {
        "_id": form_id,
        "status": "in_progress",
        "language": language,
        "created_at": now,
        "updated_at": now,
        "completed_count": 0,
        "total_fields": TOTAL_FIELDS,
        "data_enc": encrypt_json({"messages": [], "form_data": empty}),
    }
    with database_operation("create form"):
        forms_collection().insert_one(doc)
    return {"id": form_id, "status": "in_progress", "language": language, "created_at": now}


def save_form(form_id: str, request: FormSaveRequest) -> FormDetail:
    """Validate and store the whole state of one form."""
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
    with database_operation("save form"):
        result = forms_collection().update_one(
            {"_id": form_id},
            {
                "$set": {
                    "status": request.status,
                    "language": request.language,
                    "updated_at": now,
                    "completed_count": completed,
                    "data_enc": encrypt_json({"messages": messages, "form_data": normalised}),
                    **({"confirmed_at": now} if request.status == "confirmed" else {}),
                }
            },
        )
    if result.matched_count == 0:
        raise FormNotFound()
    return get_form(form_id)


def get_form(form_id: str) -> FormDetail:
    """Load and decrypt one saved form."""
    with database_operation("load form"):
        doc = forms_collection().find_one({"_id": form_id})
    if doc is None:
        raise FormNotFound()

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
    )


def list_forms(limit: int = 20) -> list[FormSummaryItem]:
    """Return saved forms, newest first, without personal details."""
    with database_operation("list forms"):
        cursor = forms_collection().find(
            {},
            {"status": 1, "language": 1, "completed_count": 1, "total_fields": 1,
             "created_at": 1, "updated_at": 1},
        ).sort("updated_at", -1).limit(limit)
        # Read the cursor inside the guard: network errors happen while iterating.
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
        )
        for doc in docs
    ]


def delete_form(form_id: str) -> bool:
    """Delete one saved form. Returns False if it did not exist."""
    with database_operation("delete form"):
        return forms_collection().delete_one({"_id": form_id}).deleted_count == 1
