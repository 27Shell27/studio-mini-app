import base64
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from fastapi import HTTPException

from app.core.config import get_settings


def create_access_token(user_id: int) -> str:
    settings = get_settings()

    payload = {
        "sub": user_id,
        "exp": int(time.time()) + 3600,
    }

    payload_json = json.dumps(payload).encode()
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode()

    signature = hmac.new(
        settings.auth_secret.encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{payload_b64}.{signature}"


def decode_access_token(token: str) -> dict:
    settings = get_settings()

    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token format")

    expected_signature = hmac.new(
        settings.auth_secret.encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=401, detail="Invalid token signature")

    try:
        payload_json = base64.urlsafe_b64decode(payload_b64.encode())
        payload = json.loads(payload_json)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    if payload["exp"] < int(time.time()):
        raise HTTPException(status_code=401, detail="Token expired")

    return payload


def validate_telegram_init_data(init_data_raw: str) -> dict:
    # Временный dev-режим для обычного браузера
    if init_data_raw.startswith("query_id=dev-query"):
        return {
            "id": 123456789,
            "first_name": "Ivan",
            "username": "ivan_dev",
        }

    settings = get_settings()

    pairs = dict(parse_qsl(init_data_raw, keep_blank_values=True))

    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="Telegram hash is missing")

    auth_date = pairs.get("auth_date")
    if not auth_date:
        raise HTTPException(status_code=401, detail="Telegram auth_date is missing")

    if int(auth_date) < int(time.time()) - 3600:
        raise HTTPException(status_code=401, detail="Telegram init data expired")

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(pairs.items())
    )

    secret_key = hmac.new(
        b"WebAppData",
        settings.telegram_bot_token.encode(),
        hashlib.sha256,
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(status_code=401, detail="Invalid Telegram init data")

    user_raw = pairs.get("user")
    if not user_raw:
        raise HTTPException(status_code=401, detail="Telegram user is missing")

    try:
        user_data = json.loads(user_raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=401, detail="Invalid Telegram user payload")

    return user_data