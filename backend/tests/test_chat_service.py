"""Merging Gemini's output into the form state (no real API calls)."""

from app.schemas.chat import FORM_FIELDS, ChatRequest, FormData, GeminiExtraction, GeminiTurnOutput
from app.services import chat_service, gemini_service


def _fake_turn(extracted: dict, next_question="What is your age?", detected="en"):
    return GeminiTurnOutput(
        reply="Thanks, noted.",
        extracted_data=GeminiExtraction(**extracted),
        next_question=next_question,
        conversation_complete=False,
        detected_language=detected,
    )


def test_merge_fills_new_fields_and_keeps_old_ones():
    current = FormData(full_name="Ananya")
    merged, updated, _errors = chat_service.merge_form_data(current, GeminiExtraction(city="Bengaluru"))
    assert merged.full_name == "Ananya"
    assert merged.city == "Bengaluru"
    assert updated == ["city"]


def test_correction_replaces_previous_value():
    current = FormData(full_name="Anaya")
    merged, updated, _errors = chat_service.merge_form_data(current, GeminiExtraction(full_name="Ananya"))
    assert merged.full_name == "Ananya"
    assert updated == ["full_name"]


def test_null_from_gemini_never_erases_a_value():
    current = FormData(age="21")
    merged, updated, _errors = chat_service.merge_form_data(current, GeminiExtraction(age=None))
    assert merged.age == "21"
    assert updated == []


def test_process_chat_reports_missing_and_completed(monkeypatch):
    monkeypatch.setattr(gemini_service, "generate_turn", lambda **kw: _fake_turn({"full_name": "Ananya"}))
    response = chat_service.process_chat(ChatRequest(message="My name is Ananya."))

    assert response.extracted_data.full_name == "Ananya"
    assert response.updated_fields == ["full_name"]
    assert "full_name" in response.completed_fields
    assert "age" in response.missing_fields
    assert response.conversation_complete is False
    assert response.next_question == "What is your age?"
    assert response.source == "gemini"


def test_conversation_complete_only_when_all_fields_known(monkeypatch):
    everything = {
        "full_name": "Ananya Rao", "age": "21", "date_of_birth": "15-08-1999", "gender": "Female",
        "mobile_number": "9876543210", "email": "ananya@example.com", "address": "12 MG Road, Bengaluru",
        "city": "Bengaluru", "state": "Karnataka", "pin_code": "560001", "occupation": "Engineer",
        "education": "B.E. Computer Science",
    }
    assert set(everything) == set(FORM_FIELDS)
    monkeypatch.setattr(gemini_service, "generate_turn", lambda **kw: _fake_turn(everything, next_question="Anything?"))
    response = chat_service.process_chat(ChatRequest(message="done"))

    assert response.missing_fields == []
    assert response.conversation_complete is True
    assert response.next_question is None


def test_unknown_detected_language_falls_back_to_selected(monkeypatch):
    monkeypatch.setattr(gemini_service, "generate_turn", lambda **kw: _fake_turn({}, detected="zz"))
    response = chat_service.process_chat(ChatRequest(message="hello", language="kn"))
    assert response.detected_language == "kn"
