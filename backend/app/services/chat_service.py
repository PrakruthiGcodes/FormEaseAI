"""Chat business logic (no HTTP here; the route calls process_chat).

Flow for one user message:
  1. Ask Gemini to read the message and reply (gemini_service.generate_turn).
  2. Validate each field Gemini found. Valid values fill empty fields or
     correct old ones. Invalid values are rejected and reported.
  3. Work out missing and completed fields in code, not by trusting the AI.
  4. Return the reply plus the updated, validated form state.
"""

from app.core.config import settings
from app.schemas.chat import (
    FORM_FIELDS,
    SUPPORTED_LANGUAGES,
    ChatRequest,
    ChatResponse,
    FormData,
    GeminiExtraction,
)
from app.services import gemini_service
from app.services.validation import validate_field


def merge_form_data(current: FormData, extracted: GeminiExtraction) -> tuple[FormData, list[str], dict]:
    """Apply Gemini's extracted values to the current form data.

    Returns (merged FormData, fields changed this turn, validation errors).
    Null values never erase data. Invalid values never replace data.
    """
    merged = current.model_dump()
    updated: list[str] = []
    errors: dict[str, str] = {}

    for field in FORM_FIELDS:
        raw = getattr(extracted, field)
        if raw is None or not str(raw).strip():
            continue
        value, error = validate_field(field, raw)
        if error:
            errors[field] = error
            continue
        if merged.get(field) != value:
            merged[field] = value
            updated.append(field)

    # Truncation is a last resort; validators already keep values short.
    for key, value in merged.items():
        if isinstance(value, str) and len(value) > settings.max_field_chars:
            merged[key] = value[: settings.max_field_chars]

    return FormData(**merged), updated, errors


def process_chat(request: ChatRequest) -> ChatResponse:
    """Handle one chat request and return the reply plus the form state."""
    history = [turn.model_dump() for turn in request.history]

    output = gemini_service.generate_turn(
        message=request.message,
        history=history,
        known=request.form_data.model_dump(),
        language_code=request.language,
    )

    merged, updated, errors = merge_form_data(request.form_data, output.extracted_data)
    merged_values = merged.model_dump()

    missing = [field for field in FORM_FIELDS if merged_values[field] is None]
    completed = [field for field in FORM_FIELDS if merged_values[field] is not None]
    is_complete = not missing

    detected = output.detected_language if output.detected_language in SUPPORTED_LANGUAGES else request.language

    return ChatResponse(
        reply=output.reply,
        extracted_data=merged,
        updated_fields=updated,
        validation_errors=errors,
        missing_fields=missing,
        completed_fields=completed,
        next_question=None if is_complete else output.next_question,
        conversation_complete=is_complete,
        detected_language=detected,
        source="gemini",
    )
