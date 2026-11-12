"""Gemini status endpoint: GET /api/gemini/status.

Checks that the key is configured and that the configured model exists.
It never returns the API key.
"""

from fastapi import APIRouter

from app.services import gemini_service

router = APIRouter(tags=["gemini"])


@router.get("/gemini/status")
def gemini_status() -> dict:
    """Ask Google whether the configured Gemini model is available."""
    return gemini_service.check_model()
