"""Application settings.

Values are read from backend/.env (if it exists) and from real environment
variables. Secrets such as GEMINI_API_KEY are read here but must never be
returned by any API endpoint, logged, or shown in error messages.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# backend/ folder: this file is backend/app/core/config.py
BACKEND_DIR = Path(__file__).resolve().parents[2]

# Load backend/.env. If the file does not exist, nothing happens.
load_dotenv(BACKEND_DIR / ".env")


def _split_csv(value: str) -> list[str]:
    """Turn 'a,b,c' into ['a', 'b', 'c'], ignoring blanks."""
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    """Simple settings object. Each attribute is read once at startup."""

    app_name: str = "FormEase AI"
    app_version: str = "1.0.0"

    # Origins allowed to call this API from a browser (the React dev server).
    cors_origins: list[str] = _split_csv(
        os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        )
    )

    # Gemini. The key is secret: do not print, log, or return it.
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()

    # MongoDB (saving and resuming forms). Optional: the app works without it.
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017").strip()
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "formease_ai").strip()

    # Key used to encrypt saved form data and chat messages. Secret.
    form_encryption_key: str = os.getenv("FORM_ENCRYPTION_KEY", "").strip()

    # Request size limits (protect the API and the Gemini quota).
    max_message_chars: int = 1000
    max_history_messages: int = 30
    max_history_message_chars: int = 2000
    max_field_chars: int = 300

    @property
    def gemini_configured(self) -> bool:
        """True if a Gemini key is present. Never returns the key itself."""
        return bool(self.gemini_api_key)

    def __repr__(self) -> str:
        # Keep the key out of any accidental print or log of the settings object.
        return (
            f"Settings(app_name={self.app_name!r}, "
            f"gemini_model={self.gemini_model!r}, "
            f"gemini_api_key={'<set>' if self.gemini_configured else '<missing>'}, "
            f"mongodb_uri=<hidden>, "
            f"form_encryption_key={'<set>' if self.form_encryption_key else '<missing>'})"
        )


settings = Settings()
