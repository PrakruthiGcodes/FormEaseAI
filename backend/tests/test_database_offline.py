"""Behaviour when MongoDB cannot be reached (runs without a database server)."""

import pytest
from fastapi.testclient import TestClient

from app.core import database
from app.core.config import settings
from app.main import app

client = TestClient(app)


@pytest.fixture
def unreachable_mongo(monkeypatch):
    # Port 1 is never a MongoDB server, so every connection fails quickly.
    monkeypatch.setattr(settings, "mongodb_uri", "mongodb://127.0.0.1:1")
    monkeypatch.setattr(database, "_client", None)
    yield
    monkeypatch.setattr(database, "_client", None)


def test_database_status_reports_unavailable(unreachable_mongo):
    body = client.get("/api/database/status").json()
    assert body["available"] is False
    assert "not reachable" in body["message"]


def test_saving_returns_503_not_a_crash(unreachable_mongo):
    response = client.post("/api/forms", json={"language": "en"})
    assert response.status_code == 503
    assert "MongoDB" in response.json()["detail"]


def test_mongo_failure_mid_request_returns_503(monkeypatch):
    # Simulates MongoDB going down after the connection check succeeded.
    from pymongo.errors import ServerSelectionTimeoutError

    class _BrokenCollection:
        def find(self, *args, **kwargs):
            raise ServerSelectionTimeoutError("connection lost")

    monkeypatch.setattr("app.services.form_store.forms_collection", lambda: _BrokenCollection())
    response = client.get("/api/forms")
    assert response.status_code == 503
    assert "not saved" in response.json()["detail"]


def test_listing_returns_503(unreachable_mongo):
    assert client.get("/api/forms").status_code == 503


def test_chat_and_pdf_do_not_need_the_database(unreachable_mongo, monkeypatch):
    from app.services import gemini_service
    from app.services.gemini_service import GeminiServiceError

    def quota(**kw):
        raise GeminiServiceError("daily_quota_exceeded")

    monkeypatch.setattr(gemini_service, "generate_turn", quota)
    assert client.post("/api/chat", json={"message": "hi"}).status_code == 429
    form = {"full_name": "Ananya Rao", "age": "21", "date_of_birth": "15-08-1999", "gender": "Female",
            "mobile_number": "9876543210", "email": "ananya@example.com", "address": "12 MG Road, Bengaluru",
            "city": "Bengaluru", "state": "Karnataka", "pin_code": "560001", "occupation": "Engineer",
            "education": "B.E. Computer Science"}
    assert client.post("/api/pdf", json={"form_data": form, "language": "en"}).status_code == 200


# ---------------------------------------------------------------------------
# Structured 503 responses for every kind of database failure. Nothing from
# the database error (URI, credentials, host, paths, traceback) may reach the
# client, and the real error is logged without credentials.
# ---------------------------------------------------------------------------

LEAKY_MARKERS = ["Traceback", 'File "', "Errno", "mongodb://", "S3cretPass", "27017", "site-packages"]


def _assert_safe_503(response):
    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/json")
    body = response.json()
    assert body["code"] == "database_unavailable"
    assert isinstance(body["detail"], str) and body["detail"]
    for marker in LEAKY_MARKERS:
        assert marker not in response.text, f"{marker!r} leaked in error response"


def test_socket_level_failure_during_request_returns_503(monkeypatch):
    # A plain OSError (not a PyMongoError) used to escape as a bare HTTP 500.
    class _SocketFailureCollection:
        def find(self, *args, **kwargs):
            raise OSError("[Errno 111] Connection refused")

    monkeypatch.setattr("app.services.form_store.forms_collection", lambda: _SocketFailureCollection())
    _assert_safe_503(client.get("/api/forms"))


def test_write_failure_during_save_returns_503(monkeypatch):
    from pymongo.errors import AutoReconnect

    class _FailingWrites:
        def update_one(self, *args, **kwargs):
            raise AutoReconnect("connection closed")

    monkeypatch.setattr("app.services.form_store.forms_collection", lambda: _FailingWrites())
    response = client.put(
        "/api/forms/00000000-0000-4000-8000-000000000000",
        json={"form_data": {"full_name": "Ananya Rao"}, "language": "en"},
    )
    _assert_safe_503(response)


def test_insert_failure_during_create_returns_503(monkeypatch):
    class _FailingInsert:
        def insert_one(self, *args, **kwargs):
            raise TimeoutError("timed out")

    monkeypatch.setattr("app.services.form_store.forms_collection", lambda: _FailingInsert())
    _assert_safe_503(client.post("/api/forms", json={"language": "en"}))


def test_connection_failure_response_has_no_credentials_or_internals(monkeypatch, caplog):
    secret_uri = "mongodb://admin:S3cretPass@127.0.0.1:1/?serverSelectionTimeoutMS=300"
    monkeypatch.setattr(settings, "mongodb_uri", secret_uri)
    monkeypatch.setattr(database, "_client", None)
    try:
        with caplog.at_level("ERROR"):
            response = client.get("/api/forms")
    finally:
        monkeypatch.setattr(database, "_client", None)

    _assert_safe_503(response)
    assert "S3cretPass" not in caplog.text
    assert "admin:" not in caplog.text
    # The failure is still logged, so operators can see what happened.
    assert any(record.name.startswith("formease") for record in caplog.records)


def test_database_error_text_is_redacted_in_logs(monkeypatch, caplog):
    from pymongo.errors import OperationFailure

    from app.core.database import safe_error_summary

    leaked = OperationFailure("auth failed for mongodb://admin:S3cretPass@db.internal:27017/x")
    assert "S3cretPass" not in safe_error_summary(leaked)
    assert "db.internal" not in safe_error_summary(leaked) or "***@" in safe_error_summary(leaked)


def test_successful_responses_are_unchanged_when_database_works(monkeypatch):
    # Non-database routes keep their normal behaviour and do not gain error fields.
    response = client.get("/api/health")
    assert response.status_code == 200
    assert set(response.json()) == {"status", "application", "version"}
