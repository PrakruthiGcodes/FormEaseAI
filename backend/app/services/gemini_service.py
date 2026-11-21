"""Gemini integration: the only module that talks to Google's API.

Responsibilities:
  * create the google-genai client from GEMINI_API_KEY (never printed or logged)
  * check that the configured model exists
  * send one conversation turn and parse the structured JSON reply
  * turn Google's errors into clear, secret-free GeminiServiceError values
"""

import json
import logging
import time
from typing import Optional

import httpx
from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.chat import FIELD_LABELS, FORM_FIELDS, SUPPORTED_LANGUAGES, GeminiTurnOutput

logger = logging.getLogger("formease.gemini")

# Error code -> (message shown to the user, HTTP status for our API).
ERROR_INFO: dict[str, tuple[str, int]] = {
    "not_configured": (
        "The AI assistant is not configured. Add GEMINI_API_KEY to backend/.env and restart the backend.",
        503,
    ),
    "invalid_api_key": (
        "Google Gemini rejected the API key. Check GEMINI_API_KEY in backend/.env.",
        502,
    ),
    "quota_exceeded": (
        "Gemini usage limit reached or too many requests. Wait a moment and try again.",
        429,
    ),
    "model_unavailable": (
        "The configured Gemini model is not available. Check GEMINI_MODEL in backend/.env.",
        502,
    ),
    "network_error": (
        "Could not reach Google Gemini. Check your internet connection and try again.",
        503,
    ),
    "daily_quota_exceeded": (
        "The daily Gemini request limit for this API key is used up. Try again tomorrow, "
        "or enable billing for the Google AI project.",
        429,
    ),
    "service_unavailable": (
        "Gemini is temporarily unavailable. Please try again in a moment.",
        503,
    ),
    "bad_request": (
        "Gemini could not process this request. Please rephrase and try again.",
        502,
    ),
    "bad_model_output": (
        "Gemini returned an unexpected response. Please try again.",
        502,
    ),
}


# Retry only errors that can clear by themselves (rate limit, temporary overload).
RETRYABLE_CODES = {"quota_exceeded", "service_unavailable"}
MAX_RETRIES = 1
RETRY_WAIT_SECONDS = 30


class GeminiServiceError(Exception):
    """An error that is safe to show to the user (contains no secrets)."""

    def __init__(self, code: str):
        self.code = code
        self.message, self.http_status = ERROR_INFO[code]
        super().__init__(self.message)


# The client is created once and reused.
_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if not settings.gemini_configured:
        raise GeminiServiceError("not_configured")
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _map_api_error(exc: errors.APIError) -> GeminiServiceError:
    """Convert a Google API error into one of our error codes.

    Only the HTTP status and the error text are inspected. The text itself
    is never returned to the user or written to logs.
    """
    status = exc.code
    text = (exc.message or "").lower()
    logger.warning("Gemini API error: HTTP %s (%s)", status, exc.status)

    if status == 400 and "api key" in text:
        return GeminiServiceError("invalid_api_key")
    if status in (401, 403):
        return GeminiServiceError("invalid_api_key")
    if status == 404:
        return GeminiServiceError("model_unavailable")
    if status == 429:
        # A daily limit cannot clear within seconds, so it is reported separately and not retried.
        if "per day" in text or "perday" in text or "daily" in text:
            return GeminiServiceError("daily_quota_exceeded")
        return GeminiServiceError("quota_exceeded")
    if status is not None and status >= 500:
        return GeminiServiceError("service_unavailable")
    return GeminiServiceError("bad_request")


def check_model() -> dict:
    """Check that the configured model exists AND accepts generation requests.

    models.get() alone is not enough: Google can list a model that is no longer
    open to new users. So this also sends a tiny generation request (a few tokens).

    Returns a dict with keys: model, available, error_code, message.
    """
    model_name = settings.gemini_model
    try:
        client = _get_client()
    except GeminiServiceError as exc:
        return {"model": model_name, "available": False, "error_code": exc.code, "message": exc.message}

    try:
        client.models.get(model=model_name)
        client.models.generate_content(
            model=model_name,
            contents="Reply with the single word OK.",
            config=types.GenerateContentConfig(max_output_tokens=16, temperature=0),
        )
    except errors.APIError as exc:
        mapped = _map_api_error(exc)
        return {"model": model_name, "available": False, "error_code": mapped.code, "message": mapped.message}
    except (httpx.HTTPError, OSError):
        logger.warning("Network error while checking Gemini model")
        err = GeminiServiceError("network_error")
        return {"model": model_name, "available": False, "error_code": err.code, "message": err.message}

    return {"model": model_name, "available": True, "error_code": None, "message": "Model is available."}


def _system_prompt(language_code: str) -> str:
    language_name = SUPPORTED_LANGUAGES.get(language_code, "English")
    field_list = ", ".join(FORM_FIELDS)
    return f"""You are FormEase AI, an accessible, empathetic conversational assistant helping rural and diverse citizens fill out application forms easily through conversation.

FIELDS TO COLLECT (in this order): {field_list}.
Labels: {json.dumps(FIELD_LABELS)}

CORE INSTRUCTIONS:
1. DIALOGUE IN CITIZEN'S NATIVE LANGUAGE:
   - Always write "reply" and "next_question" in {language_name}.
   - Use warm, simple, everyday words suited for rural citizens (avoid formal or complex bureaucracy).
   - Acknowledge what was recorded kindly, and clearly ask for the single next missing field.

2. SPELLING & TYPO VERIFICATION & CORRECTION:
   - Users speaking or typing in regional languages often make phonetic errors, speech-to-text slips, or spelling mistakes (e.g. "Bengalur" or "Banglore" -> "Bengaluru", "femal" -> "Female", "karnatak" -> "Karnataka", "stuednt" -> "Student").
   - Carefully verify, correct, and standardize city names, state names, occupations, educational qualifications, and general terms so the recorded data is clean, valid, and properly spelled.

3. DUAL EXTRACTION (CITIZEN VIEW + ADMIN FORM COLLECTOR VIEW):
   - "extracted_data": The newly stated or corrected fields written in the citizen's native language ({language_name}) or script, with spelling corrected.
   - "english_data": The EXACT same newly stated or corrected fields translated and transliterated into standardized ENGLISH for administrative form collectors and government officials:
     * full_name: Transliterate to Latin / English script (e.g. "रमेश पाटील" -> "Ramesh Patil", "ಅನನ್ಯ ರಾವ್" -> "Ananya Rao").
     * gender: Standardize to "Male", "Female", or "Other".
     * occupation: Translate to English (e.g. "शेतकरी" -> "Farmer", "रैतु" -> "Farmer", "मजदूर" -> "Laborer", "विद्यार्थी" -> "Student").
     * education: Translate to English (e.g. "पदवीधर" -> "Graduate", "दहावी" -> "10th Pass", "प्राथमिक" -> "Primary School").
     * address, city, state: Standardize in English (e.g. "पुणे" -> "Pune", "महाराष्ट्र" -> "Maharashtra").
     * mobile_number, age, pin_code, date_of_birth, email: Format cleanly in digits / standard formats.

4. ACCURACY & CONVERSATION RULES:
   - Ask for ONE missing field at a time in the order above. If the user answered multiple fields in one go, record all of them.
   - Extract only what was clearly stated. NEVER invent or guess values. Unstated fields must be null.
   - Both "extracted_data" and "english_data" must contain ONLY fields newly provided or corrected in the LATEST message. All other fields must be null.
   - Do not ask again for fields already known in KNOWN FORM DATA. If a user corrects a field, update it.
   - Convert spelled-out numbers (age, PIN code, mobile number) into digits.
   - "next_question" is the single question for the next missing field, written in {language_name}. Use null only when all 12 fields are complete.
   - "conversation_complete" is true only when every field in the list is known.
   - "detected_language" is the language code the user wrote in (one of: en, hi, kn, ta, te, ml, bn, mr, gu, pa).
   - Return only the JSON object described by the response schema."""


def _build_contents(history: list[dict], message: str, known: dict) -> list[types.Content]:
    """Turn the conversation into Gemini's content format."""
    contents: list[types.Content] = []
    for turn in history:
        role = "model" if turn["role"] == "assistant" else "user"
        contents.append(types.Content(role=role, parts=[types.Part(text=turn["content"])]))

    known_values = {key: value for key, value in known.items() if value is not None}
    missing = [field for field in FORM_FIELDS if field not in known_values]
    final_text = (
        f"KNOWN FORM DATA (JSON): {json.dumps(known_values, ensure_ascii=False)}\n"
        f"MISSING FIELDS: {json.dumps(missing)}\n\n"
        f"LATEST USER MESSAGE:\n{message}"
    )
    contents.append(types.Content(role="user", parts=[types.Part(text=final_text)]))
    return contents


def generate_turn(message: str, history: list[dict], known: dict, language_code: str) -> GeminiTurnOutput:
    """Send one conversation turn to Gemini and return its structured reply."""
    client = _get_client()
    config = types.GenerateContentConfig(
        system_instruction=_system_prompt(language_code),
        response_mime_type="application/json",
        response_schema=GeminiTurnOutput,
        temperature=0.2,
    )

    contents = _build_contents(history, message, known)
    attempt = 0
    while True:
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=config,
            )
            break
        except errors.APIError as exc:
            mapped = _map_api_error(exc)
            # Rate limits and temporary overload often clear within a minute.
            if mapped.code in RETRYABLE_CODES and attempt < MAX_RETRIES:
                attempt += 1
                logger.info("Gemini busy (%s). Retrying in %s seconds.", mapped.code, RETRY_WAIT_SECONDS)
                time.sleep(RETRY_WAIT_SECONDS)
                continue
            raise mapped from None
        except (httpx.HTTPError, OSError):
            logger.warning("Network error while calling Gemini")
            raise GeminiServiceError("network_error") from None

    # Prefer the SDK's parsed object; fall back to validating the raw JSON text.
    if isinstance(response.parsed, GeminiTurnOutput):
        return response.parsed
    try:
        return GeminiTurnOutput.model_validate_json(response.text or "")
    except (ValidationError, ValueError):
        logger.warning("Gemini returned JSON that did not match the expected schema")
        raise GeminiServiceError("bad_model_output") from None
