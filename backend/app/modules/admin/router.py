from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_admin_user
from app.db.models import Booking, BookingStatus
from app.db.session import get_db
from app.modules.bookings.schemas import AdminBookingRead, BookingStatusUpdate
from app.modules.notifications.service import send_booking_status_message

router = APIRouter(prefix="/admin", tags=["admin"])


def _to_admin_booking_read(booking: Booking) -> AdminBookingRead:
    return AdminBookingRead(
        id=booking.id,
        service_id=booking.service_id,
        service_title=booking.service.title,
        booking_date=booking.booking_date,
        start_at=booking.start_at,
        end_at=booking.end_at,
        phone=booking.phone,
        comment=booking.comment,
        status=booking.status,
        user_id=booking.user_id,
        user_first_name=booking.user.first_name,
        user_username=booking.user.username,
        user_telegram_id=booking.user.telegram_id,
    )


@router.get("/bookings", response_model=list[AdminBookingRead])
async def list_admin_bookings(
    status_filter: BookingStatus | None = Query(default=None, alias="status"),
    _admin_user: Annotated[dict, Depends(get_current_admin_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    query = (
        select(Booking)
        .options(
            selectinload(Booking.service),
            selectinload(Booking.user),
        )
        .order_by(Booking.booking_date.desc(), Booking.start_at.asc())
    )

    if status_filter is not None:
        query = query.where(Booking.status == status_filter)

    result = await db.execute(query)
    bookings = result.scalars().all()

    return [_to_admin_booking_read(booking) for booking in bookings]


@router.patch("/bookings/{booking_id}/status", response_model=AdminBookingRead)
async def update_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    _admin_user: Annotated[dict, Depends(get_current_admin_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.service),
            selectinload(Booking.user),
        )
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != payload.status:
        booking.status = payload.status
        await db.commit()

    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.service),
            selectinload(Booking.user),
        )
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one()

    await send_booking_status_message(
        chat_id=booking.user.telegram_id,
        service_title=booking.service.title,
        booking_date=booking.booking_date,
        start_at=booking.start_at,
        status=booking.status,
    )

    return _to_admin_booking_read(booking)