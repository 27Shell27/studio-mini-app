from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import create_access_token, validate_telegram_init_data
from app.db.models import User
from app.db.session import get_db
from app.modules.auth.schemas import TelegramLoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram-login")
async def telegram_login(
    data: TelegramLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    tg_user = validate_telegram_init_data(data.init_data_raw)

    telegram_id = tg_user["id"]
    first_name = tg_user.get("first_name", "")
    username = tg_user.get("username")

    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            telegram_id=telegram_id,
            first_name=first_name,
            username=username,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.first_name = first_name
        user.username = username
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "first_name": user.first_name,
            "username": user.username,
        },
    }


@router.get("/me")
async def me(current_user: Annotated[dict, Depends(get_current_user)]):
    return current_user