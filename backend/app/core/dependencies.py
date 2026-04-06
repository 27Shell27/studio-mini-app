from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.models import User
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization required")

    payload = decode_access_token(credentials.credentials)

    user = await db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "first_name": user.first_name,
        "username": user.username,
    }


def _parse_admin_ids(raw: str) -> set[int]:
    return {
        int(item.strip())
        for item in raw.split(",")
        if item.strip()
    }


async def get_current_admin_user(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    settings = get_settings()
    admin_ids = _parse_admin_ids(settings.admin_telegram_ids)

    if current_user["telegram_id"] not in admin_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user