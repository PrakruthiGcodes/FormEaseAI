"""Chat endpoint: POST /api/chat.

This route only validates input and maps errors to HTTP responses.
All AI logic lives in services/chat_service.py and services/gemini_service.py.
"""

from fastapi import APIRouter, HTTPException

from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat_service
from app.services.gemini_service import GeminiServiceError

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    """Accept a user message plus conversation state and return the AI reply."""
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        return chat_service.process_chat(request)
    except GeminiServiceError as exc:
        # The detail is an object so the frontend can show the message and code.
        raise HTTPException(
            status_code=exc.http_status,
            detail={"message": exc.message, "code": exc.code},
        ) from None
