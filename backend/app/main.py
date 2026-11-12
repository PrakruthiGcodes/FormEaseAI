"""FastAPI application entry point.

Run from the backend/ folder:
    uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.api.routes import chat, form, forms, gemini, health
from app.core.config import settings
from app.core.crypto import DecryptionFailed, EncryptionUnavailable
from app.core.database import STOPPED_MESSAGE, DatabaseUnavailable, safe_error_summary
from app.services.form_store import FormNotFound, FormValidationFailed

# Log INFO and above. No module logs API keys, form values, or messages.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

# Allow the React dev server (and any origins listed in CORS_ORIGINS) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


def _service_unavailable(message: str, code: str) -> JSONResponse:
    """Structured 503. `detail` is the text to show; `code` is stable for clients."""
    return JSONResponse(status_code=503, content={"detail": message, "code": code})


@app.exception_handler(DatabaseUnavailable)
async def _database_unavailable(_: Request, exc: DatabaseUnavailable) -> JSONResponse:
    # The message is one of two fixed strings in core/database.py: no URI, host or credentials.
    return _service_unavailable(str(exc), "database_unavailable")


@app.exception_handler(EncryptionUnavailable)
async def _encryption_unavailable(_: Request, exc: EncryptionUnavailable) -> JSONResponse:
    return _service_unavailable(str(exc), "encryption_unavailable")


@app.exception_handler(PyMongoError)
async def _mongo_error(_: Request, exc: PyMongoError) -> JSONResponse:
    # Safety net for any driver error raised outside the form store. Log only a redacted summary.
    logging.getLogger("formease.database").error(
        "MongoDB error outside a guarded operation (%s): %s",
        type(exc).__name__,
        safe_error_summary(exc),
    )
    return _service_unavailable(STOPPED_MESSAGE, "database_unavailable")


@app.exception_handler(DecryptionFailed)
async def _decryption_failed(_: Request, exc: DecryptionFailed) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.exception_handler(FormNotFound)
async def _form_not_found(_: Request, exc: FormNotFound) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": "Form not found."})


@app.exception_handler(FormValidationFailed)
async def _form_validation_failed(_: Request, exc: FormValidationFailed) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": {"message": str(exc), "validation_errors": exc.errors, "missing_fields": exc.missing}},
    )


# All API routes live under /api.
app.include_router(health.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(gemini.router, prefix="/api")
app.include_router(form.router, prefix="/api")
app.include_router(forms.router, prefix="/api")
