"""Gemini service: error mapping, prompt building, and config (no real API calls)."""

import pytest
from google.genai import errors

from app.core.config import settings
from app.schemas.chat import GeminiTurnOutput
from app.services import gemini_service
from app.services.gemini_service import GeminiServiceError


def _api_error(code: int, message: str = "error") -> errors.APIError:
    return errors.ClientError(code, {"error": {"code": code, "message": message, "status": "X"}})


@pytest.mark.parametrize(
    "code,message,expected",
    [
        (400, "API key not valid. Please pass a valid API key.", "invalid_api_key"),
        (403, "forbidden", "invalid_api_key"),
        (404, "model not found", "model_unavailable"),
        (429, "quota exceeded", "quota_exceeded"),
        (429, "Generate content requests per day limit exceeded on Free Tier.", "daily_quota_exceeded"),
        (500, "internal", "service_unavailable"),
        (503, "overloaded", "service_unavailable"),
        (400, "bad argument", "bad_request"),
    ],
)
def test_api_errors_map_to_safe_codes(code, message, expected):
    assert gemini_service._map_api_error(_api_error(code, message)).code == expected


# The real client factory, captured before conftest blocks live calls.
REAL_GET_CLIENT = gemini_service._get_client


def test_missing_key_is_reported(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(gemini_service, "_client", None)
    monkeypatch.setattr(gemini_service, "_get_client", REAL_GET_CLIENT)
    with pytest.raises(GeminiServiceError) as info:
        gemini_service.generate_turn(message="hi", history=[], known={}, language_code="en")
    assert info.value.code == "not_configured"


def test_error_messages_never_contain_the_key(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "SECRET-VALUE-123")
    for code in gemini_service.ERROR_INFO:
        assert "SECRET-VALUE-123" not in GeminiServiceError(code).message


class _ModelsRetired:
    """Lists the model fine, but generation fails (like a retired model)."""

    def get(self, model):
        return object()

    def generate_content(self, **kwargs):
        raise _api_error(404, "This model is no longer available to new users.")


class _ClientRetired:
    models = _ModelsRetired()


def test_check_model_reports_unavailable_when_generation_fails(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "SECRET-VALUE-123")
    monkeypatch.setattr(gemini_service, "_get_client", lambda: _ClientRetired())
    status = gemini_service.check_model()
    assert status["available"] is False
    assert status["error_code"] == "model_unavailable"
    assert "SECRET-VALUE-123" not in str(status)


def test_settings_repr_hides_key(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "SECRET-VALUE-123")
    assert "SECRET-VALUE-123" not in repr(settings)


def test_build_contents_puts_history_then_context_last():
    history = [{"role": "user", "content": "hello"}, {"role": "assistant", "content": "hi"}]
    contents = gemini_service._build_contents(history, "My city is Pune", {"full_name": "Ananya"})
    assert [c.role for c in contents] == ["user", "model", "user"]
    final_text = contents[-1].parts[0].text
    assert "My city is Pune" in final_text
    assert '"full_name": "Ananya"' in final_text
    assert "MISSING FIELDS" in final_text


class _FakeModels:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        return self.response


class _FakeClient:
    def __init__(self, response):
        self.models = _FakeModels(response)


class _FakeResponse:
    def __init__(self, text, parsed=None):
        self.text = text
        self.parsed = parsed


def test_generate_turn_uses_json_schema_and_selected_language(monkeypatch):
    payload = GeminiTurnOutput(
        reply="ok", extracted_data={}, next_question="Age?", conversation_complete=False, detected_language="kn"
    )
    client = _FakeClient(_FakeResponse(payload.model_dump_json(), parsed=payload))
    monkeypatch.setattr(gemini_service, "_get_client", lambda: client)

    result = gemini_service.generate_turn(message="hello", history=[], known={}, language_code="kn")

    assert result.detected_language == "kn"
    config = client.models.calls[0]["config"]
    assert config.response_mime_type == "application/json"
    assert "Kannada" in config.system_instruction


class _FlakyModels:
    """Fails once with a rate-limit error, then returns a valid reply."""

    def __init__(self, payload):
        self.payload = payload
        self.calls = 0

    def generate_content(self, **kwargs):
        self.calls += 1
        if self.calls == 1:
            raise _api_error(429, "quota exceeded")
        return _FakeResponse(self.payload.model_dump_json(), parsed=self.payload)


class _FlakyClient:
    def __init__(self, payload):
        self.models = _FlakyModels(payload)


def test_generate_turn_retries_once_on_rate_limit(monkeypatch):
    payload = GeminiTurnOutput(
        reply="ok", extracted_data={}, next_question="Age?", conversation_complete=False, detected_language="en"
    )
    client = _FlakyClient(payload)
    waits = []
    monkeypatch.setattr(gemini_service, "_get_client", lambda: client)
    monkeypatch.setattr(gemini_service.time, "sleep", lambda s: waits.append(s))

    result = gemini_service.generate_turn(message="hi", history=[], known={}, language_code="en")

    assert result.reply == "ok"
    assert client.models.calls == 2
    assert waits == [gemini_service.RETRY_WAIT_SECONDS]


def test_generate_turn_does_not_retry_daily_quota(monkeypatch):
    """A daily limit cannot clear in seconds, so retrying only wastes time and requests."""

    class _DailyModels:
        calls = 0

        def generate_content(self, **kwargs):
            _DailyModels.calls += 1
            raise _api_error(429, "Generate content requests per day limit exceeded on Free Tier.")

    class _DailyClient:
        models = _DailyModels()

    monkeypatch.setattr(gemini_service, "_get_client", lambda: _DailyClient())
    monkeypatch.setattr(gemini_service.time, "sleep", lambda s: pytest.fail("daily quota must not be retried"))
    with pytest.raises(GeminiServiceError) as info:
        gemini_service.generate_turn(message="hi", history=[], known={}, language_code="en")
    assert info.value.code == "daily_quota_exceeded"
    assert _DailyModels.calls == 1


def test_generate_turn_does_not_retry_invalid_key(monkeypatch):
    class _BadKeyModels:
        calls = 0

        def generate_content(self, **kwargs):
            _BadKeyModels.calls += 1
            raise _api_error(400, "API key not valid")

    class _BadKeyClient:
        models = _BadKeyModels()

    monkeypatch.setattr(gemini_service, "_get_client", lambda: _BadKeyClient())
    monkeypatch.setattr(gemini_service.time, "sleep", lambda s: pytest.fail("must not retry"))
    with pytest.raises(GeminiServiceError) as info:
        gemini_service.generate_turn(message="hi", history=[], known={}, language_code="en")
    assert info.value.code == "invalid_api_key"
    assert _BadKeyModels.calls == 1


def test_generate_turn_rejects_malformed_json(monkeypatch):
    client = _FakeClient(_FakeResponse("this is not json", parsed=None))
    monkeypatch.setattr(gemini_service, "_get_client", lambda: client)
    with pytest.raises(GeminiServiceError) as info:
        gemini_service.generate_turn(message="hi", history=[], known={}, language_code="en")
    assert info.value.code == "bad_model_output"
