"""Security and privacy isolation tests for FormEase AI forms.

Tests:
  1. Per-session ownership and zero global listing:
     - User A saves form with X-Session-Token: token-A.
     - User B with token-B (or no header) gets [] from GET /api/forms.
     - User B with token-B (or no header) gets 403 on GET/PUT/DELETE /api/forms/{form_id}.
  2. PIN and reference-code unlock with brute-force protection:
     - Invalid reference code or PIN returns uniform 403.
     - 5 consecutive failed attempts trigger 429 Too Many Requests.
     - Correct PIN returns 200 with decrypted form data and binds active session.
  3. Kiosk data wiping:
     - Permanent deletion removes document from MongoDB so unlock fails.
  4. Header authorization:
     - Single-record operations with X-Access-Pin allow valid access and reject invalid PINs.
"""

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.core import database
from app.core.config import settings
from app.main import app

TEST_DB = "formease_privacy_test"


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


@pytest.fixture(autouse=True)
def isolated_database(monkeypatch):
    monkeypatch.setattr(settings, "mongodb_db_name", TEST_DB)
    monkeypatch.setattr(database, "_client", None)
    yield
    MongoClient(settings.mongodb_uri).drop_database(TEST_DB)
    monkeypatch.setattr(database, "_client", None)


def test_user_session_isolation_and_zero_global_listing():
    """User A's forms cannot be listed, viewed, edited, or deleted by User B or unauthenticated callers."""
    client_a = TestClient(app, headers={"X-Session-Token": "token-user-A"})
    client_b = TestClient(app, headers={"X-Session-Token": "token-user-B"})
    client_unauth = TestClient(app)

    # User A creates a form
    create_res = client_a.post("/api/forms", json={"language": "kn", "access_pin": "1234"})
    assert create_res.status_code == 201
    form_a_id = create_res.json()["id"]
    ref_code = create_res.json()["reference_code"]
    assert ref_code.startswith("FE-")

    # User A saves details
    save_res = client_a.put(f"/api/forms/{form_a_id}", json={
        "form_data": {"full_name": "ಮಂಜುನಾಥ್", "city": "ಮೈಸೂರು"},
        "language": "kn",
    })
    assert save_res.status_code == 200

    # User A lists forms: sees their own form
    list_a = client_a.get("/api/forms").json()
    assert len(list_a) == 1
    assert list_a[0]["id"] == form_a_id
    assert list_a[0]["reference_code"] == ref_code

    # User B lists forms: gets empty list []
    list_b = client_b.get("/api/forms").json()
    assert list_b == []

    # Unauthenticated / shared kiosk user lists forms: gets empty list []
    list_unauth = client_unauth.get("/api/forms").json()
    assert list_unauth == []

    # User B tries to view User A's form: 403 Forbidden
    res_b_get = client_b.get(f"/api/forms/{form_a_id}")
    assert res_b_get.status_code == 403

    # Unauthenticated user tries to view User A's form: 403 Forbidden
    res_unauth_get = client_unauth.get(f"/api/forms/{form_a_id}")
    assert res_unauth_get.status_code == 403

    # User B tries to edit User A's form: 403 Forbidden
    res_b_put = client_b.put(f"/api/forms/{form_a_id}", json={"form_data": {"full_name": "Hacker"}})
    assert res_b_put.status_code == 403

    # User B tries to delete User A's form: 403 Forbidden
    res_b_del = client_b.delete(f"/api/forms/{form_a_id}")
    assert res_b_del.status_code == 403

    # Unauthenticated user tries to delete User A's form: 403 Forbidden
    res_unauth_del = client_unauth.delete(f"/api/forms/{form_a_id}")
    assert res_unauth_del.status_code == 403


def test_unlock_pin_verification_and_brute_force_protection():
    """Unlock requires correct reference code + PIN, rate-limits after 5 failures, and binds session."""
    client_creator = TestClient(app, headers={"X-Session-Token": "initial-token"})
    create_res = client_creator.post("/api/forms", json={"language": "mr", "access_pin": "5678"})
    assert create_res.status_code == 201
    form_id = create_res.json()["id"]
    ref_code = create_res.json()["reference_code"]
    assert create_res.json()["access_pin_issued"] == "5678"

    client_creator.put(f"/api/forms/{form_id}", json={
        "form_data": {"full_name": "विकास पाटील", "mobile_number": "9876543210"},
        "language": "mr",
    })

    client_unlocker = TestClient(app)

    # 1. Non-existent reference code returns 403
    bad_ref_res = client_unlocker.post("/api/forms/unlock", json={
        "reference_code": "FE-9999",
        "access_pin": "5678",
    })
    assert bad_ref_res.status_code == 403
    assert bad_ref_res.json()["detail"] == "Invalid reference code or PIN"

    # 2. 5 wrong PIN attempts for valid reference code (all return 403)
    for _ in range(5):
        wrong_res = client_unlocker.post("/api/forms/unlock", json={
            "reference_code": ref_code,
            "access_pin": "0000",
        })
        assert wrong_res.status_code == 403
        assert wrong_res.json()["detail"] == "Invalid reference code or PIN"

    # After 5 consecutive failed attempts, subsequent attempts trigger 429 Too Many Requests
    locked_res = client_unlocker.post("/api/forms/unlock", json={
        "reference_code": ref_code,
        "access_pin": "0000",
    })
    assert locked_res.status_code == 429
    assert "Too many incorrect attempts" in locked_res.json()["detail"]

    # Even with correct PIN, reference code remains locked
    locked_correct_res = client_unlocker.post("/api/forms/unlock", json={
        "reference_code": ref_code,
        "access_pin": "5678",
    })
    assert locked_correct_res.status_code == 429


def test_unlock_success_binds_session_token():
    """Correct unlock returns decrypted data and binds the caller's session token."""
    client_creator = TestClient(app, headers={"X-Session-Token": "kiosk-token-1"})
    create_res = client_creator.post("/api/forms", json={"language": "en", "access_pin": "4321"})
    form_id = create_res.json()["id"]
    ref_code = create_res.json()["reference_code"]

    client_creator.put(f"/api/forms/{form_id}", json={
        "form_data": {"full_name": "Rohan Sharma", "city": "Bengaluru"},
        "language": "en",
    })

    # Another client resumes using reference code + PIN and supplies their own session token
    client_resumer = TestClient(app, headers={"X-Session-Token": "mobile-session-token"})
    unlock_res = client_resumer.post("/api/forms/unlock", json={
        "reference_code": ref_code,
        "access_pin": "4321",
    })
    assert unlock_res.status_code == 200
    unlocked_data = unlock_res.json()
    assert unlocked_data["id"] == form_id
    assert unlocked_data["form_data"]["full_name"] == "Rohan Sharma"
    assert unlocked_data["reference_code"] == ref_code

    # The new session is now bound; client_resumer can list and access the form directly
    listed = client_resumer.get("/api/forms").json()
    assert any(item["id"] == form_id for item in listed)

    resumed_direct = client_resumer.get(f"/api/forms/{form_id}").json()
    assert resumed_direct["form_data"]["city"] == "Bengaluru"


def test_single_record_pin_header_authorization():
    """Callers without matching session token can authenticate via X-Access-Pin header."""
    client_creator = TestClient(app, headers={"X-Session-Token": "orig-session"})
    create_res = client_creator.post("/api/forms", json={"language": "en", "access_pin": "7890"})
    form_id = create_res.json()["id"]

    client_creator.put(f"/api/forms/{form_id}", json={
        "form_data": {"full_name": "Priya Nair"},
        "language": "en",
    })

    # External client with correct X-Access-Pin header succeeds
    client_pin = TestClient(app, headers={"X-Access-Pin": "7890"})
    res = client_pin.get(f"/api/forms/{form_id}")
    assert res.status_code == 200
    assert res.json()["form_data"]["full_name"] == "Priya Nair"

    # External client with wrong X-Access-Pin header fails with 403
    client_wrong_pin = TestClient(app, headers={"X-Access-Pin": "0000"})
    assert client_wrong_pin.get(f"/api/forms/{form_id}").status_code == 403


def test_permanent_deletion_wipes_data():
    """Deleting a form permanently removes the document from MongoDB; subsequent unlocks fail."""
    client = TestClient(app, headers={"X-Session-Token": "delete-test-session"})
    create_res = client.post("/api/forms", json={"language": "en", "access_pin": "1122"})
    form_id = create_res.json()["id"]
    ref_code = create_res.json()["reference_code"]

    client.put(f"/api/forms/{form_id}", json={
        "form_data": {"full_name": "Citizen To Wipe", "mobile_number": "9998887776"},
        "language": "en",
    })

    # Permanently delete the form (Kiosk Wipe)
    del_res = client.delete(f"/api/forms/{form_id}")
    assert del_res.status_code == 204

    # Verify directly in MongoDB that the document is completely gone
    raw_doc = MongoClient(settings.mongodb_uri)[TEST_DB][database.FORMS_COLLECTION].find_one({"_id": form_id})
    assert raw_doc is None

    # Subsequent GET returns 404
    assert client.get(f"/api/forms/{form_id}").status_code == 404

    # Subsequent unlock attempt returns 403 (does not exist)
    unlock_res = client.post("/api/forms/unlock", json={"reference_code": ref_code, "access_pin": "1122"})
    assert unlock_res.status_code == 403
