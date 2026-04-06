from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Service
from app.db.session import get_db
from app.modules.services.schemas import ServiceRead

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceRead])
async def list_services(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Service)
        .where(Service.is_active.is_(True))
        .order_by(Service.id.asc())
    )
    return result.scalars().all()


@router.get("/{service_id}", response_model=ServiceRead)
async def get_service(
    service_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.is_active.is_(True),
        )
    )
    service = result.scalar_one_or_none()

    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    return service