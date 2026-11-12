"""Encryption for saved form data (Fernet: AES-based, authenticated).

The key comes from FORM_ENCRYPTION_KEY in backend/.env. Without it, nothing
is saved, so personal data is never stored unencrypted.
"""

import json

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class EncryptionUnavailable(Exception):
    """Raised when no valid encryption key is configured."""


class DecryptionFailed(Exception):
    """Raised when stored data cannot be decrypted (wrong or changed key)."""


def _fernet() -> Fernet:
    if not settings.form_encryption_key:
        raise EncryptionUnavailable("FORM_ENCRYPTION_KEY is not set in backend/.env.")
    try:
        return Fernet(settings.form_encryption_key.encode())
    except (ValueError, TypeError):
        raise EncryptionUnavailable("FORM_ENCRYPTION_KEY is not a valid Fernet key.") from None


def encrypt_json(data) -> str:
    """Encrypt any JSON-serialisable value to a text token."""
    return _fernet().encrypt(json.dumps(data, ensure_ascii=False).encode("utf-8")).decode("ascii")


def decrypt_json(token: str):
    """Decrypt a token created by encrypt_json."""
    try:
        return json.loads(_fernet().decrypt(token.encode("ascii")).decode("utf-8"))
    except InvalidToken:
        raise DecryptionFailed("Saved data could not be decrypted.") from None
