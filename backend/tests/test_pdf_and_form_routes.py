"""PDF generation and the form validation/PDF endpoints (offline, no database)."""

import io

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.main import app
from app.services.pdf_service import build_form_pdf

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


def _pdf_text(pdf_bytes: bytes) -> str:
    return "".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf_bytes)).pages)


def test_pdf_contains_every_confirmed_field():
    text = _pdf_text(build_form_pdf(COMPLETE, "English"))
    for value in ["Ananya Rao", "21", "15-08-1999", "9876543210", "ananya@example.com", "560001", "Karnataka"]:
        assert value in text


@pytest.mark.parametrize("sample", ["ಅನನ್ಯ ರಾವ್", "अनन्या राव", "అనన్య రావు"])
def test_pdf_builds_for_indian_scripts(sample):
    pdf = build_form_pdf(dict(COMPLETE, full_name=sample), "Kannada")
    assert pdf.startswith(b"%PDF")


MULTILINGUAL = {
    "hi": {"full_name": "अनन्या राव", "city": "बेंगलुरु", "occupation": "इंजीनियर"},
    "kn": {"full_name": "ಅನನ್ಯ ರಾವ್", "city": "ಬೆಂಗಳೂರು", "occupation": "ಇಂಜಿನಿಯರ್"},
    "te": {"full_name": "అనన್య రావు", "city": "బెంగళూరు", "occupation": "ఇంజనీర్"},
}


@pytest.mark.parametrize("lang", sorted(MULTILINGUAL))
def test_pdf_text_extracts_correctly_for_indian_scripts(lang):
    """The text layer must hold the exact characters the user typed (not just a valid PDF)."""
    values = dict(COMPLETE, **MULTILINGUAL[lang])
    text = _pdf_text(build_form_pdf(values, lang))
    for value in MULTILINGUAL[lang].values():
        assert value in text, f"{value!r} missing from extracted {lang} text"


def test_pdf_uses_unicode_font_for_indian_scripts():
    from app.services.pdf_service import FONT, NIRMALA_PATH

    if not NIRMALA_PATH.exists():
        pytest.skip("Nirmala UI font not installed; PDF falls back to Helvetica (English only)")
    assert FONT == "FormEaseUnicode"
    reader = PdfReader(io.BytesIO(build_form_pdf(COMPLETE, "English")))
    fonts = reader.pages[0]["/Resources"]["/Font"]
    base_names = [str(font_obj.get_object()["/BaseFont"]) for font_obj in fonts.values()]
    assert any("Nirmala" in name or "FormEase" in name for name in base_names), base_names


def test_pdf_endpoint_accepts_indic_names_end_to_end():
    form = dict(COMPLETE, full_name="ಅನನ್ಯ ರಾವ್", city="ಬೆಂಗಳೂರು")
    response = client.post("/api/pdf", json={"form_data": form, "language": "kn"})
    assert response.status_code == 200
    assert "ಅನನ್ಯ ರಾವ್" in _pdf_text(response.content)


def test_pdf_refuses_incomplete_values():
    with pytest.raises(ValueError):
        build_form_pdf(dict(COMPLETE, email=None), "English")


def test_pdf_endpoint_returns_pdf_for_complete_form():
    response = client.post("/api/pdf", json={"form_data": COMPLETE, "language": "en"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")


def test_pdf_endpoint_inline_for_preview():
    response = client.post("/api/pdf?disposition=inline", json={"form_data": COMPLETE, "language": "en"})
    assert response.status_code == 200
    assert "inline" in response.headers["content-disposition"]


def test_pdf_endpoint_lists_missing_fields():
    form = dict(COMPLETE, email=None, city=None)
    response = client.post("/api/pdf", json={"form_data": form, "language": "en"})
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert set(detail["missing_fields"]) == {"email", "city"}


def test_pdf_endpoint_reports_invalid_values():
    form = dict(COMPLETE, mobile_number="123")
    response = client.post("/api/pdf", json={"form_data": form, "language": "en"})
    assert response.status_code == 422
    assert "mobile_number" in response.json()["detail"]["validation_errors"]


def test_validate_endpoint_normalises_and_reports():
    response = client.post(
        "/api/form/validate",
        json={"form_data": {"mobile_number": "+91 98765 43210", "email": "BAD", "full_name": "Ananya Rao"}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["form_data"]["mobile_number"] == "9876543210"
    assert "email" in body["validation_errors"]
    assert body["all_required_present"] is False
    assert "full_name" in body["completed_fields"]


def test_chat_response_has_validation_errors_field(monkeypatch):
    from app.schemas.chat import GeminiExtraction, GeminiTurnOutput
    from app.services import gemini_service

    turn = GeminiTurnOutput(
        reply="Thanks.",
        extracted_data=GeminiExtraction(mobile_number="123"),
        next_question="What is your mobile number?",
        conversation_complete=False,
        detected_language="en",
    )
    monkeypatch.setattr(gemini_service, "generate_turn", lambda **kw: turn)
    response = client.post("/api/chat", json={"message": "my number is 123"})
    assert response.status_code == 200
    body = response.json()
    assert "mobile_number" in body["validation_errors"]
    assert body["extracted_data"]["mobile_number"] is None
