"""Portal submission endpoint: POST /api/submit."""

from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.portal_submit import dispatch_portal_submission

router = APIRouter(tags=["submit"])


class PortalSubmitRequest(BaseModel):
    form_type: str = Field(default="general", max_length=30)
    english_form_data: dict[str, Any] = Field(default_factory=dict)
    english_extra_fields: dict[str, Any] = Field(default_factory=dict)
    form_id: Optional[str] = None


@router.post("/submit")
def submit_to_portal(request: PortalSubmitRequest) -> dict[str, Any]:
    """Map verified English data to the appropriate standard protocol and dispatch."""
    return dispatch_portal_submission(
        form_type=request.form_type,
        english_form_data=request.english_form_data,
        english_extra_fields=request.english_extra_fields,
        form_id=request.form_id,
    )
