"""Saved-form endpoints (MongoDB): save, resume, list, delete.

Every id is checked to be a UUID before it is used, so arbitrary text
never reaches the database query.
"""

import re

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from app.core.database import check_database
from app.schemas.chat import SUPPORTED_LANGUAGES, FormDetail, FormSaveRequest, FormSummaryItem
from app.services import form_store

router = APIRouter(tags=["forms"])

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


class CreateFormRequest(BaseModel):
    language: str = Field(default="en", max_length=10)


def _check_id(form_id: str) -> str:
    if not UUID_RE.match(form_id):
        raise HTTPException(status_code=404, detail="Form not found.")
    return form_id


@router.get("/database/status")
def database_status() -> dict:
    """Says whether MongoDB is reachable. Used by the frontend on startup."""
    return check_database()


@router.post("/forms", status_code=201)
def create_form(request: CreateFormRequest) -> dict:
    if request.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=422, detail="Unsupported language.")
    return form_store.create_form(request.language)


@router.get("/forms", response_model=list[FormSummaryItem])
def list_forms() -> list[FormSummaryItem]:
    return form_store.list_forms()


@router.get("/forms/{form_id}", response_model=FormDetail)
def get_form(form_id: str) -> FormDetail:
    return form_store.get_form(_check_id(form_id))


@router.put("/forms/{form_id}", response_model=FormDetail)
def save_form(form_id: str, request: FormSaveRequest) -> FormDetail:
    return form_store.save_form(_check_id(form_id), request)


@router.delete("/forms/{form_id}", status_code=204)
def delete_form(form_id: str) -> Response:
    if not form_store.delete_form(_check_id(form_id)):
        raise HTTPException(status_code=404, detail="Form not found.")
    return Response(status_code=204)
