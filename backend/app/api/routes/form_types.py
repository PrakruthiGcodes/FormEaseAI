"""Form types endpoint: GET /api/form-types."""

from fastapi import APIRouter

from app.services.form_types import get_all_form_types

router = APIRouter(tags=["form-types"])


@router.get("/form-types")
def list_form_types() -> list[dict]:
    """Return all available form types, their descriptions, and domain extra fields."""
    return get_all_form_types()
