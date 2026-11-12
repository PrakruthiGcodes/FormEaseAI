"""Request, response, and Gemini output models for the chat feature.

Two kinds of models live here:
  * API models (ChatRequest, ChatResponse, FormData): validated with size limits.
  * Gemini models (GeminiExtraction, GeminiTurnOutput): plain types, because
    Gemini's structured-output schema does not need our length limits.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.config import settings

# Language codes the app supports (Indian languages plus English).
SUPPORTED_LANGUAGES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "kn": "Kannada",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
    "pa": "Punjabi",
}

# The fields the assistant collects, in the order it asks for them.
FORM_FIELDS: list[str] = [
    "full_name",
    "age",
    "date_of_birth",
    "gender",
    "mobile_number",
    "email",
    "address",
    "city",
    "state",
    "pin_code",
    "occupation",
    "education",
]

# Human-readable labels (used in the UI and in prompts).
FIELD_LABELS: dict[str, str] = {
    "full_name": "Full name",
    "age": "Age",
    "date_of_birth": "Date of birth",
    "gender": "Gender",
    "mobile_number": "Mobile number",
    "email": "Email",
    "address": "Address",
    "city": "City",
    "state": "State",
    "pin_code": "PIN code",
    "occupation": "Occupation",
    "education": "Education",
}


def _clean_text(value):
    """Strip whitespace and turn empty strings into None."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


class FormData(BaseModel):
    """Form values collected so far. Each field is optional until it is known."""

    full_name: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    age: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    date_of_birth: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    gender: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    mobile_number: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    email: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    address: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    city: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    state: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    pin_code: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    occupation: Optional[str] = Field(default=None, max_length=settings.max_field_chars)
    education: Optional[str] = Field(default=None, max_length=settings.max_field_chars)

    @field_validator("*", mode="before")
    @classmethod
    def clean_values(cls, value):
        return _clean_text(value)


class ChatTurn(BaseModel):
    """One earlier message in the conversation."""

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=settings.max_history_message_chars)


class ChatRequest(BaseModel):
    """Body of POST /api/chat."""

    message: str = Field(default="", max_length=settings.max_message_chars)
    history: list[ChatTurn] = Field(
        default_factory=list,
        max_length=settings.max_history_messages,
    )
    form_data: FormData = Field(default_factory=FormData)
    language: str = Field(default="en", max_length=10)

    @field_validator("message", mode="before")
    @classmethod
    def strip_message(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("language")
    @classmethod
    def check_language(cls, value: str) -> str:
        if value not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{value}'. Supported: {', '.join(SUPPORTED_LANGUAGES)}."
            )
        return value


class ChatResponse(BaseModel):
    """Reply returned to the frontend."""

    reply: str
    extracted_data: FormData
    updated_fields: list[str]
    validation_errors: dict[str, str] = Field(default_factory=dict)
    missing_fields: list[str]
    completed_fields: list[str]
    next_question: Optional[str]
    conversation_complete: bool
    detected_language: str
    source: Literal["gemini"]


class FormValidateRequest(BaseModel):
    """Body of POST /api/form/validate: values typed or edited by the user."""

    form_data: FormData


class FormValidateResponse(BaseModel):
    """Normalised values plus any per-field errors."""

    form_data: FormData
    validation_errors: dict[str, str]
    missing_fields: list[str]
    completed_fields: list[str]
    all_required_present: bool


MAX_SAVED_MESSAGES = 200


class FormSaveRequest(BaseModel):
    """Body of PUT /api/forms/{id}: the whole saved state of one form."""

    messages: list[ChatTurn] = Field(default_factory=list, max_length=MAX_SAVED_MESSAGES)
    form_data: FormData = Field(default_factory=FormData)
    language: str = Field(default="en", max_length=10)
    status: Literal["in_progress", "confirmed"] = "in_progress"

    @field_validator("language")
    @classmethod
    def check_language(cls, value: str) -> str:
        if value not in SUPPORTED_LANGUAGES:
            raise ValueError("Unsupported language.")
        return value


class FormSummaryItem(BaseModel):
    """Safe metadata for the list of saved forms. Contains no personal details."""

    id: str
    status: str
    language: str
    completed_count: int
    total_fields: int
    created_at: str
    updated_at: str


class FormDetail(BaseModel):
    """Full saved state of one form, returned when resuming."""

    id: str
    status: str
    language: str
    messages: list[ChatTurn]
    form_data: FormData
    missing_fields: list[str]
    completed_count: int
    total_fields: int
    created_at: str
    updated_at: str


# ----- Gemini output (plain types for the structured-output schema) -----


class GeminiExtraction(BaseModel):
    """Fields Gemini found in the latest user message. null = not stated."""

    full_name: Optional[str] = None
    age: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None


class GeminiTurnOutput(BaseModel):
    """The JSON object Gemini must return for every chat turn."""

    reply: str
    extracted_data: GeminiExtraction
    next_question: Optional[str] = None
    conversation_complete: bool
    detected_language: str
