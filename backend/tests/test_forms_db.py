"""Saving, resuming and encryption of forms in MongoDB.

Uses a SEPARATE test database (formease_test) which is dropped after the tests.
Skipped automatically if MongoDB is not running.
"""

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.core import database
from app.core.config import settings
from app.main import app

TEST_DB = "formease_test"


def _mongo_running() -> bool:
    try:
        MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=1500).admin.command("ping")
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not (_mongo_running() and settings.form_encryption_key),
    reason="MongoDB not running or FORM_ENCRYPTION_KEY not set",
)

client = TestClient(app)

COMPLETE = {
    "full_name": "Ananya Rao",
    "age": "21",
    "date_of_birth": "15-08-1999",
    "gender": "Female",
    "mobile_number": "9876543210",
    "email": "ananya@example.com",
    "address": "12 MG Road, Bengaluru",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pin_code": "560001",
    "occupation": "Engineer",
    "education": "B.E. Computer Science",
}


@pytest.fixture(autouse=True)
def isolated_database(monkeypatch):
    monkeypatch.setattr(settings, "mongodb_db_name", TEST_DB)
    monkeypatch.setattr(database, "_client", None)
    yield
    MongoClient(settings.mongodb_uri).drop_database(TEST_DB)
    monkeypatch.setattr(database, "_client", None)


def _create(language="en") -> str:
    response = client.post("/api/forms", json={"language": language})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_database_status_reports_connected():
    body = client.get("/api/database/status").json()
    assert body["available"] is True


def test_create_save_and_resume_form():
    form_id = _create("kn")
    messages = [{"role": "user", "content": "ನನ್ನ ಹೆಸರು ಅನನ್ಯ"}, {"role": "assistant", "content": "ಧನ್ಯವಾದ"}]
    saved = client.put(f"/api/forms/{form_id}", json={
        "messages": messages, "form_data": {"full_name": "Ananya Rao"}, "language": "kn", "status": "in_progress",
    })
    assert saved.status_code == 200, saved.text

    resumed = client.get(f"/api/forms/{form_id}").json()
    assert resumed["form_data"]["full_name"] == "Ananya Rao"
    assert resumed["messages"] == messages
    assert resumed["language"] == "kn"
    assert "age" in resumed["missing_fields"]


def test_personal_data_is_encrypted_at_rest():
    form_id = _create()
    client.put(f"/api/forms/{form_id}", json={
        "messages": [{"role": "user", "content": "My name is Ananya Rao"}],
        "form_data": {"full_name": "Ananya Rao", "mobile_number": "9876543210"},
        "language": "en",
    })
    raw = MongoClient(settings.mongodb_uri)[TEST_DB][database.FORMS_COLLECTION].find_one({"_id": form_id})
    raw_text = str(raw)
    assert "Ananya" not in raw_text
    assert "9876543210" not in raw_text
    assert "Ananya" not in str(client.get("/api/forms").json())


def test_list_returns_metadata_without_names():
    form_id = _create()
    client.put(f"/api/forms/{form_id}", json={"form_data": {"full_name": "Ananya Rao"}, "language": "en"})
    listing = client.get("/api/forms").json()
    assert any(item["id"] == form_id for item in listing)
    item = next(item for item in listing if item["id"] == form_id)
    assert item["completed_count"] == 1
    assert item["total_fields"] == 12
    assert "Ananya" not in str(listing)


def test_cannot_confirm_incomplete_form():
    form_id = _create()
    response = client.put(f"/api/forms/{form_id}", json={"form_data": {"full_name": "Ananya Rao"}, "status": "confirmed"})
    assert response.status_code == 422
    assert "age" in response.json()["detail"]["missing_fields"]


def test_confirm_complete_form():
    form_id = _create()
    response = client.put(f"/api/forms/{form_id}", json={"form_data": COMPLETE, "status": "confirmed"})
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
    assert response.json()["missing_fields"] == []


def test_invalid_values_are_not_saved():
    form_id = _create()
    response = client.put(f"/api/forms/{form_id}", json={"form_data": {"mobile_number": "123"}})
    assert response.status_code == 422
    assert "mobile_number" in response.json()["detail"]["validation_errors"]


def test_delete_and_missing_form():
    form_id = _create()
    assert client.delete(f"/api/forms/{form_id}").status_code == 204
    assert client.get(f"/api/forms/{form_id}").status_code == 404


def test_bad_id_is_rejected_without_query():
    assert client.get("/api/forms/not-a-uuid").status_code == 404
