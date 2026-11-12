"""Form endpoints: validation and PDF generation.

  POST /api/form/validate  check and normalise values the user typed or edited
  POST /api/pdf            build the PDF (inline for preview, or as a download)
"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.schemas.chat import (
    FORM_FIELDS,
    SUPPORTED_LANGUAGES,
    FormData,
    FormValidateRequest,
    FormValidateResponse,
)
from app.services.pdf_service import build_form_pdf
from app.services.validation import validate_form

router = APIRouter(tags=["form"])


class PdfRequest(BaseModel):
    form_data: FormData
    language: str = Field(default="en", max_length=10)


def _check_required(normalised: dict, errors: dict) -> list[str]:
    return [field for field in FORM_FIELDS if not normalised.get(field)]


@router.post("/form/validate", response_model=FormValidateResponse)
def validate(request: FormValidateRequest) -> FormValidateResponse:
    """Check and normalise form values. Invalid values are reported, not stored."""
    normalised, errors = validate_form(request.form_data.model_dump())
    missing = _check_required(normalised, errors)
    completed = [field for field in FORM_FIELDS if normalised.get(field)]
    return FormValidateResponse(
        form_data=FormData(**normalised),
        validation_errors=errors,
        missing_fields=missing,
        completed_fields=completed,
        all_required_present=not missing and not errors,
    )


@router.post("/pdf")
def generate_pdf(
    request: PdfRequest,
    disposition: Literal["inline", "attachment"] = Query(default="attachment"),
) -> Response:
    """Generate the PDF. Refuses to build it until every field is filled in and valid."""
    if request.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=422, detail="Unsupported language.")

    normalised, errors = validate_form(request.form_data.model_dump())
    missing = _check_required(normalised, errors)
    if errors or missing:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "The form is incomplete or has invalid values. Fix them before creating the PDF.",
                "missing_fields": missing,
                "validation_errors": errors,
            },
        )

    pdf_bytes = build_form_pdf(normalised, language_name=SUPPORTED_LANGUAGES[request.language])
    filename = "formease_form.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'},
    )
