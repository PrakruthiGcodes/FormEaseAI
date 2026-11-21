"""Saved-form endpoints (MongoDB): save, resume, list, unlock, delete.

Privacy and security enforcement:
  * Every id is checked to be a UUID before it is used.
  * Session isolation: listing returns ONLY forms owned by the active session.
  * Unlocking requires reference code + 4-digit PIN with brute-force rate-limiting.
  * Single-record operations require matching X-Session-Token or X-Access-Pin header.
  * Only structural, non-PII events are logged.
"""

import logging
import re
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Response

from app.core.database import check_database
from app.schemas.chat import (
    SUPPORTED_LANGUAGES,
    CreateFormRequest,
    CreateFormResponse,
    FormDetail,
    FormSaveRequest,
    FormSummaryItem,
    UnlockFormRequest,
)
from app.services import form_store

logger = logging.getLogger("formease.forms")
router = APIRouter(tags=["forms"])

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def _check_id(form_id: str) -> str:
    if not UUID_RE.match(form_id):
        raise HTTPException(status_code=404, detail="Form not found.")
    return form_id


@router.get("/database/status")
def database_status() -> dict:
    """Says whether MongoDB is reachable. Used by the frontend on startup."""
    return check_database()


@router.post("/forms", response_model=CreateFormResponse, status_code=201)
def create_form(
    request: CreateFormRequest,
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
) -> dict:
    if request.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=422, detail="Unsupported language.")
    result = form_store.create_form(
        language=request.language,
        session_token=x_session_token,
        access_pin=request.access_pin,
    )
    logger.info("Form created: id=%s language=%s", result["id"], request.language)
    return result


@router.post("/forms/unlock", response_model=FormDetail)
def unlock_form(
    request: UnlockFormRequest,
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
) -> FormDetail:
    logger.info("Attempting form unlock for reference code: %s", request.reference_code.strip().upper())
    return form_store.unlock_form(
        reference_code=request.reference_code,
        access_pin=request.access_pin,
        session_token=x_session_token,
    )


@router.get("/forms", response_model=list[FormSummaryItem])
def list_forms(
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
) -> list[FormSummaryItem]:
    return form_store.list_forms(session_token=x_session_token)


@router.get("/forms/{form_id}", response_model=FormDetail)
def get_form(
    form_id: str,
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    x_access_pin: Optional[str] = Header(None, alias="X-Access-Pin"),
) -> FormDetail:
    return form_store.get_form(
        _check_id(form_id),
        session_token=x_session_token,
        access_pin=x_access_pin,
    )


@router.put("/forms/{form_id}", response_model=FormDetail)
def save_form(
    form_id: str,
    request: FormSaveRequest,
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    x_access_pin: Optional[str] = Header(None, alias="X-Access-Pin"),
) -> FormDetail:
    result = form_store.save_form(
        _check_id(form_id),
        request,
        session_token=x_session_token,
        access_pin=x_access_pin,
    )
    logger.info("Form saved: id=%s status=%s", form_id, request.status)
    return result


@router.patch("/forms/{form_id}", response_model=FormDetail)
def patch_form(
    form_id: str,
    request: FormSaveRequest,
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    x_access_pin: Optional[str] = Header(None, alias="X-Access-Pin"),
) -> FormDetail:
    result = form_store.save_form(
        _check_id(form_id),
        request,
        session_token=x_session_token,
        access_pin=x_access_pin,
    )
    logger.info("Form patched: id=%s status=%s", form_id, request.status)
    return result


@router.delete("/forms/{form_id}", status_code=204)
def delete_form(
    form_id: str,
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    x_access_pin: Optional[str] = Header(None, alias="X-Access-Pin"),
) -> Response:
    if not form_store.delete_form(
        _check_id(form_id),
        session_token=x_session_token,
        access_pin=x_access_pin,
    ):
        raise HTTPException(status_code=404, detail="Form not found.")
    logger.info("Form deleted: id=%s", form_id)
    return Response(status_code=204)
