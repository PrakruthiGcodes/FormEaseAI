"""Chat business logic (no HTTP here; the route calls process_chat).

Flow for one user message:
  1. Ask Gemini to read the message and reply (gemini_service.generate_turn).
  2. Validate each field Gemini found. Valid values fill empty fields or
     correct old ones. Invalid values are rejected and reported.
  3. Work out missing and completed fields in code, not by trusting the AI.
  4. Return the reply plus the updated, validated form state.
"""

import logging

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
from app.services.form_types import (
    get_extra_field_keys,
    get_extra_field_prompt,
    validate_extra_field,
)
from app.services.validation import validate_field

logger = logging.getLogger("formease.chat")


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
        form_type=request.form_type,
        known_extra=request.extra_fields,
    )

    merged, updated, errors = merge_form_data(request.form_data, output.extracted_data)
    merged_values = merged.model_dump()

    # Merge English data for administrative form collector / admin
    if request.language == "en":
        merged_english = merged
    elif output.english_data:
        base_english = request.english_form_data if request.english_form_data else FormData()
        merged_english, _, _ = merge_form_data(base_english, output.english_data)
    else:
        merged_english = request.english_form_data if request.english_form_data else FormData()

    # Domain-specific extra fields handling
    extra_keys = get_extra_field_keys(request.form_type)
    merged_extra = dict(request.extra_fields or {})
    merged_eng_extra = dict(request.english_extra_fields or {})
    extra_updated: list[str] = []

    for key in extra_keys:
        # Check native extraction
        raw_val = getattr(output.extracted_data, key, None)
        if raw_val is not None and str(raw_val).strip():
            val, err = validate_extra_field(key, raw_val)
            if err:
                errors[key] = err
            elif val is not None:
                if merged_extra.get(key) != val:
                    merged_extra[key] = val
                    extra_updated.append(key)
        # Check English extraction
        if output.english_data:
            eng_raw = getattr(output.english_data, key, None)
            if eng_raw is not None and str(eng_raw).strip():
                eng_val, _ = validate_extra_field(key, eng_raw)
                if eng_val is not None:
                    merged_eng_extra[key] = eng_val
        elif key in merged_extra and key not in merged_eng_extra:
            merged_eng_extra[key] = merged_extra[key]

    missing = [field for field in FORM_FIELDS if merged_values[field] is None]
    completed = [field for field in FORM_FIELDS if merged_values[field] is not None]

    missing_extra = [k for k in extra_keys if not merged_extra.get(k)]
    completed_extra = [k for k in extra_keys if merged_extra.get(k)]

    # Backwards compatibility: General forms complete when all 12 core fields are known.
    if request.form_type == "general" or not extra_keys:
        is_complete = not missing
        next_q = None if is_complete else output.next_question
    else:
        is_complete = (not missing) and (not missing_extra)
        if is_complete:
            next_q = None
        elif missing:
            next_q = output.next_question
        else:
            # Core fields done; ask for next missing domain extra field
            next_extra_field = missing_extra[0]
            # Use Gemini's question if available and relevant, otherwise use localized prompt hint
            next_q = output.next_question or get_extra_field_prompt(
                next_extra_field, request.form_type, request.language
            )

    detected = output.detected_language if output.detected_language in SUPPORTED_LANGUAGES else request.language

    logger.info(
        "Chat turn processed: form_type=%s language=%s detected=%s updated_fields=%d complete=%s",
        request.form_type,
        request.language,
        detected,
        len(updated) + len(extra_updated),
        is_complete,
    )

    return ChatResponse(
        reply=output.reply,
        extracted_data=merged,
        english_data=merged_english,
        updated_fields=updated + extra_updated,
        validation_errors=errors,
        missing_fields=missing,
        completed_fields=completed,
        next_question=next_q,
        conversation_complete=is_complete,
        detected_language=detected,
        source="gemini",
        form_type=request.form_type,
        extra_fields=merged_extra,
        english_extra_fields=merged_eng_extra,
        missing_extra_fields=missing_extra,
        completed_extra_fields=completed_extra,
    )
