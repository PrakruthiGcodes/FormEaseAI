"""LIVE tests against the real Gemini API.

These call Google and need a valid GEMINI_API_KEY in backend/.env (or the
environment) and available quota. Without a key they are skipped.

Quota handling (important):
  * If the daily or per-minute quota is exhausted, the tests are reported as
    BLOCKED BY QUOTA (skipped), NOT as failures. A quota block says nothing
    about the application's logic.
  * One quota check runs for the whole session, so a blocked quota does not
    produce six separate failures or repeated retries.
  * Any other error (invalid key, unavailable model, wrong answer) is a real
    failure and is reported as one.

Run from backend/:
    .venv\\Scripts\\python.exe -m pytest tests/test_live_gemini.py -v
"""

import pytest

from app.core.config import settings
from app.schemas.chat import ChatRequest, FormData
from app.services import chat_service, gemini_service
from app.services.gemini_service import GeminiServiceError

QUOTA_CODES = {
    "daily_quota_exceeded": "daily free-tier limit reached; retry after the reset or enable billing",
    "quota_exceeded": "per-minute rate limit reached; retry in about a minute",
}

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(not settings.gemini_configured, reason="GEMINI_API_KEY not set"),
]


def _blocked(code: str, message: str) -> None:
    pytest.skip(f"BLOCKED BY QUOTA ({code}): {QUOTA_CODES[code]}. {message}")


@pytest.fixture(scope="session")
def gemini_gate():
    """One live check for the whole session: is the key valid, the model usable, and quota available?"""
    status = gemini_service.check_model()
    if status["error_code"] in QUOTA_CODES:
        _blocked(status["error_code"], "No live conversation tests were run.")
    if not status["available"]:
        pytest.fail(f"Gemini configuration problem ({status['error_code']}): {status['message']}")
    return status


def _send(message, form=None, history=None, language="en"):
    """Run one real conversation turn. Quota errors become BLOCKED BY QUOTA skips."""
    request = ChatRequest(
        message=message,
        form_data=form or FormData(),
        history=history or [],
        language=language,
    )
    try:
        return chat_service.process_chat(request)
    except GeminiServiceError as exc:
        if exc.code in QUOTA_CODES:
            _blocked(exc.code, "Quota ran out during the live tests.")
        raise


def test_model_is_available(gemini_gate):
    assert gemini_gate["model"] == settings.gemini_model
    assert gemini_gate["available"] is True


def test_1_extracts_full_name(gemini_gate):
    result = _send("My name is Ananya.")
    assert result.extracted_data.full_name and "Ananya" in result.extracted_data.full_name


def test_2_extracts_city(gemini_gate):
    result = _send("I live in Bengaluru.")
    assert result.extracted_data.city and "Bengaluru" in result.extracted_data.city


def test_3_extracts_age(gemini_gate):
    result = _send("I am 21 years old.")
    assert result.extracted_data.age == "21"


def test_4_kannada_answer_gets_reply_in_selected_language(gemini_gate):
    result = _send("ನನ್ನ ಹೆಸರು ಅನನ್ಯ.", language="kn")
    assert result.detected_language == "kn"
    assert result.reply.strip()


def test_5_incomplete_info_asks_for_missing_field(gemini_gate):
    result = _send("Hi, my name is Ravi and I'm from Pune")
    assert result.next_question
    assert result.missing_fields


def test_6_correction_updates_previous_value(gemini_gate):
    first = _send("My name is Anaya.")
    second = _send(
        "Sorry, my name is actually Ananya.",
        form=first.extracted_data,
        history=[
            {"role": "user", "content": "My name is Anaya."},
            {"role": "assistant", "content": first.reply},
        ],
    )
    assert second.extracted_data.full_name and "Ananya" in second.extracted_data.full_name
    assert "full_name" in second.updated_fields
