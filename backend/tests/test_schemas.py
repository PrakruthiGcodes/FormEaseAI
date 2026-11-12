"""Input validation and size limits."""

import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.chat import ChatRequest, FormData


def test_form_data_blank_strings_become_none():
    data = FormData(full_name="   ", city="  Bengaluru  ")
    assert data.full_name is None
    assert data.city == "Bengaluru"


def test_language_must_be_supported():
    with pytest.raises(ValidationError):
        ChatRequest(message="hi", language="xx")


def test_message_length_limit():
    with pytest.raises(ValidationError):
        ChatRequest(message="a" * (settings.max_message_chars + 1))


def test_history_length_limit():
    history = [{"role": "user", "content": "x"}] * (settings.max_history_messages + 1)
    with pytest.raises(ValidationError):
        ChatRequest(message="hi", history=history)


def test_history_role_must_be_user_or_assistant():
    with pytest.raises(ValidationError):
        ChatRequest(message="hi", history=[{"role": "system", "content": "x"}])


def test_field_length_limit():
    with pytest.raises(ValidationError):
        FormData(full_name="a" * (settings.max_field_chars + 1))
