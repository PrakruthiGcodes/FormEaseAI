"""HTTP-level tests for POST /api/chat (Gemini is mocked)."""

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.chat import GeminiExtraction, GeminiTurnOutput
from app.services import gemini_service
from app.services.gemini_service import GeminiServiceError

client = TestClient(app)


def _turn(**extracted):
    return GeminiTurnOutput(
        reply="Noted. What is your age?",
        extracted_data=GeminiExtraction(**extracted),
        next_question="What is your age?",
        conversation_complete=False,
        detected_language="en",
    )


def test_health_still_works():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "application": "FormEase AI", "version": "1.0.0"}


def test_empty_message_rejected():
    response = client.post("/api/chat", json={"message": "   "})
    assert response.status_code == 400
    assert response.json()["detail"] == "Message cannot be empty."


def test_success_returns_full_structure(monkeypatch):
    monkeypatch.setattr(gemini_service, "generate_turn", lambda **kw: _turn(full_name="Ananya"))
    response = client.post("/api/chat", json={"message": "My name is Ananya.", "language": "en"})
    assert response.status_code == 200
    body = response.json()
    for key in [
        "reply", "extracted_data", "updated_fields", "missing_fields", "completed_fields",
        "next_question", "conversation_complete", "detected_language", "source",
    ]:
        assert key in body
    assert body["extracted_data"]["full_name"] == "Ananya"


def test_gemini_error_is_returned_without_secrets(monkeypatch):
    def fail(**kw):
        raise GeminiServiceError("invalid_api_key")

    monkeypatch.setattr(gemini_service, "generate_turn", fail)
    response = client.post("/api/chat", json={"message": "hi"})
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "invalid_api_key"


def test_unsupported_language_rejected():
    response = client.post("/api/chat", json={"message": "hi", "language": "klingon"})
    assert response.status_code == 422


def test_oversized_message_rejected():
    response = client.post("/api/chat", json={"message": "a" * 1001})
    assert response.status_code == 422
