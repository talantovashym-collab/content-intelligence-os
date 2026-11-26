"""Encryption for secrets users store with us (their own AI provider keys).

Fernet (AES-128-CBC + HMAC-SHA256). The key comes from ENCRYPTION_KEY when set,
otherwise it is derived from SECRET_KEY, so changing SECRET_KEY makes stored
provider keys unreadable and users have to enter them again.
"""

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class SecretUnreadable(Exception):
    """A stored secret could not be decrypted (the encryption key changed)."""


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    if settings.ENCRYPTION_KEY:
        return Fernet(settings.ENCRYPTION_KEY.encode())
    digest = hashlib.sha256(b"content-intelligence/api-keys:" + settings.SECRET_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as e:
        raise SecretUnreadable("Stored secret cannot be decrypted with the current key") from e


def hint(secret: str) -> str:
    """What the UI may show of a secret: its last four characters."""
    return "…" + secret[-4:] if len(secret) >= 8 else "…"
