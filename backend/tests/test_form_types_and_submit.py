"""Tests for Form Type Registry, Domain Extensions, and Standards-Based Portal Submission."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.chat import FORM_FIELDS, ChatRequest, FormData, GeminiExtraction, GeminiTurnOutput
from app.services import chat_service, gemini_service

client = TestClient(app)

COMPLETE_CORE = {
    "full_name": "Ramesh Patil",
    "age": "45",
    "date_of_birth": "10-05-1979",
    "gender": "Male",
    "mobile_number": "9876543210",
    "email": "ramesh@example.com",
    "address": "45 Market Yard, Hubballi",
    "city": "Hubballi",
    "state": "Karnataka",
    "pin_code": "580020",
    "occupation": "Farmer",
    "education": "High School",
}


def _mock_gemini_turn(extracted: dict, next_question=None, complete=False, detected="en"):
    return GeminiTurnOutput(
        reply="Noted.",
        extracted_data=GeminiExtraction(**extracted),
        next_question=next_question,
        conversation_complete=complete,
        detected_language=detected,
    )


def test_get_form_types_endpoint():
    """GET /api/form-types returns all 4 domain types with their extra field definitions."""
    res = client.get("/api/form-types")
    assert res.status_code == 200
    types_list = res.json()
    assert len(types_list) == 4
    type_ids = [t["id"] for t in types_list]
    assert "general" in type_ids
    assert "medical" in type_ids
    assert "education" in type_ids
    assert "government" in type_ids

    # Medical checks
    medical = next(t for t in types_list if t["id"] == "medical")
    medical_keys = [f["key"] for f in medical["extra_fields"]]
    assert medical_keys == ["symptoms_or_reason", "medical_history", "blood_group", "emergency_contact"]

    # Education checks
    education = next(t for t in types_list if t["id"] == "education")
    edu_keys = [f["key"] for f in education["extra_fields"]]
    assert edu_keys == ["previous_institution", "course_or_degree", "passed_out_year", "percentage_or_grade"]

    # Government checks
    gov = next(t for t in types_list if t["id"] == "government")
    gov_keys = [f["key"] for f in gov["extra_fields"]]
    assert gov_keys == ["scheme_name", "annual_family_income", "ration_or_id_type"]


def test_general_form_type_backwards_compatibility(monkeypatch):
    """When form_type is 'general' or omitted, completing 12 core fields completes the conversation."""
    monkeypatch.setattr(
        gemini_service,
        "generate_turn",
        lambda **kw: _mock_gemini_turn(COMPLETE_CORE, next_question=None, complete=True),
    )
    req = ChatRequest(message="done", form_type="general")
    resp = chat_service.process_chat(req)
    assert resp.conversation_complete is True
    assert resp.missing_fields == []
    assert resp.missing_extra_fields == []
    assert resp.next_question is None


def test_medical_domain_progression(monkeypatch):
    """Medical form asks domain questions after 12 core fields are filled and completes only when all extra fields are known."""
    # Step 1: 12 core fields filled, but medical extra fields are empty
    monkeypatch.setattr(
        gemini_service,
        "generate_turn",
        lambda **kw: _mock_gemini_turn({}, next_question="What are your symptoms?", complete=False),
    )
    req_step1 = ChatRequest(
        message="core is complete",
        form_data=FormData(**COMPLETE_CORE),
        form_type="medical",
        extra_fields={},
    )
    resp1 = chat_service.process_chat(req_step1)
    assert resp1.conversation_complete is False
    assert resp1.missing_fields == []  # Core fields are full
    assert "symptoms_or_reason" in resp1.missing_extra_fields
    assert "blood_group" in resp1.missing_extra_fields
    assert resp1.next_question is not None

    # Step 2: User provides symptoms and medical history
    monkeypatch.setattr(
        gemini_service,
        "generate_turn",
        lambda **kw: _mock_gemini_turn(
            {"symptoms_or_reason": "Severe fever and cough", "medical_history": "None"},
            next_question="What is your blood group?",
            complete=False,
        ),
    )
    req_step2 = ChatRequest(
        message="I have fever and cough, no past illnesses",
        form_data=FormData(**COMPLETE_CORE),
        form_type="medical",
        extra_fields={},
    )
    resp2 = chat_service.process_chat(req_step2)
    assert resp2.conversation_complete is False
    assert resp2.extra_fields["symptoms_or_reason"] == "Severe fever and cough"
    assert resp2.extra_fields["medical_history"] == "None"
    assert "blood_group" in resp2.missing_extra_fields

    # Step 3: Complete remaining medical fields (blood group and emergency contact)
    monkeypatch.setattr(
        gemini_service,
        "generate_turn",
        lambda **kw: _mock_gemini_turn(
            {"blood_group": "O+", "emergency_contact": "9876543211"},
            next_question=None,
            complete=True,
        ),
    )
    req_step3 = ChatRequest(
        message="O positive and brother 9876543211",
        form_data=FormData(**COMPLETE_CORE),
        form_type="medical",
        extra_fields=resp2.extra_fields,
    )
    resp3 = chat_service.process_chat(req_step3)
    assert resp3.conversation_complete is True
    assert resp3.missing_extra_fields == []
    assert resp3.extra_fields["blood_group"] == "O+"
    assert resp3.extra_fields["emergency_contact"] == "9876543211"
    assert resp3.next_question is None


def test_education_domain_progression(monkeypatch):
    """Education form asks for previous institution, course, pass-out year, and marks."""
    monkeypatch.setattr(
        gemini_service,
        "generate_turn",
        lambda **kw: _mock_gemini_turn(
            {
                "previous_institution": "Govt High School",
                "course_or_degree": "B.Sc Computer Science",
                "passed_out_year": "2023",
                "percentage_or_grade": "88%",
            },
            next_question=None,
            complete=True,
        ),
    )
    req = ChatRequest(
        message="Govt High School B.Sc in 2023 with 88%",
        form_data=FormData(**COMPLETE_CORE),
        form_type="education",
    )
    resp = chat_service.process_chat(req)
    assert resp.conversation_complete is True
    assert resp.extra_fields["previous_institution"] == "Govt High School"
    assert resp.extra_fields["course_or_degree"] == "B.Sc Computer Science"
    assert resp.extra_fields["passed_out_year"] == "2023"
    assert resp.extra_fields["percentage_or_grade"] == "88%"


def test_portal_submit_medical_fhir_bundle():
    """POST /api/submit generates a valid HL7 FHIR R4 Bundle for medical forms."""
    payload = {
        "form_type": "medical",
        "english_form_data": COMPLETE_CORE,
        "english_extra_fields": {
            "symptoms_or_reason": "High fever with chills",
            "medical_history": "Hypertension",
            "blood_group": "B+",
            "emergency_contact": "Sunita Patil (Wife) 9876500000",
        },
    }
    res = client.post("/api/submit", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "submitted"
    assert data["protocol_standard"] == "HL7 FHIR R4"
    assert data["acknowledgement_id"].startswith("OPD-KA-2026-")
    assert data["sandbox_mode"] is True

    bundle = data["dispatched_payload"]
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "collection"
    assert len(bundle["entry"]) == 4

    # Patient resource check
    patient = bundle["entry"][0]["resource"]
    assert patient["resourceType"] == "Patient"
    assert patient["name"][0]["text"] == "Ramesh Patil"
    assert patient["gender"] == "male"
    assert patient["birthDate"] == "1979-05-10"
    assert patient["address"][0]["city"] == "Hubballi"
    assert patient["contact"][0]["name"]["text"] == "Sunita Patil (Wife) 9876500000"

    # Encounter resource check
    encounter = bundle["entry"][1]["resource"]
    assert encounter["resourceType"] == "Encounter"
    assert encounter["reasonCode"][0]["text"] == "High fever with chills"

    # Observation resource check
    observation = bundle["entry"][2]["resource"]
    assert observation["resourceType"] == "Observation"
    assert observation["valueString"] == "B+"

    # Condition resource check
    condition = bundle["entry"][3]["resource"]
    assert condition["resourceType"] == "Condition"
    assert condition["note"][0]["text"] == "Hypertension"


def test_portal_submit_education_nsp_payload():
    """POST /api/submit generates an NSP / University admissions payload for education forms."""
    payload = {
        "form_type": "education",
        "english_form_data": COMPLETE_CORE,
        "english_extra_fields": {
            "previous_institution": "National Pre-University College",
            "course_or_degree": "B.Com",
            "passed_out_year": "2024",
            "percentage_or_grade": "92.5%",
        },
    }
    res = client.post("/api/submit", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "submitted"
    assert data["acknowledgement_id"].startswith("EDU-2026-")
    assert "NSP" in data["protocol_standard"]

    dispatched = data["dispatched_payload"]
    assert dispatched["student_profile"]["full_name"] == "Ramesh Patil"
    assert dispatched["academic_intake_details"]["previous_institution"] == "National Pre-University College"
    assert dispatched["academic_intake_details"]["course_or_degree"] == "B.Com"
    assert dispatched["academic_intake_details"]["passed_out_year"] == "2024"


def test_portal_submit_government_scheme_payload():
    """POST /api/submit generates an e-Governance Seva Sindhu payload for government forms."""
    payload = {
        "form_type": "government",
        "english_form_data": COMPLETE_CORE,
        "english_extra_fields": {
            "scheme_name": "Gruha Lakshmi Scheme",
            "annual_family_income": "85000",
            "ration_or_id_type": "BPL Card (Priority Household)",
        },
    }
    res = client.post("/api/submit", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "submitted"
    assert data["acknowledgement_id"].startswith("GOV-KA-2026-")
    assert "Seva Sindhu" in data["protocol_standard"]

    dispatched = data["dispatched_payload"]
    assert dispatched["applicant_profile"]["name"] == "Ramesh Patil"
    assert dispatched["scheme_application_details"]["target_scheme_name"] == "Gruha Lakshmi Scheme"
    assert dispatched["scheme_application_details"]["annual_family_income_inr"] == "85000"
    assert dispatched["scheme_application_details"]["ration_card_or_id_type"] == "BPL Card (Priority Household)"
