from datetime import date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.db.models import Booking, BookingStatus, Service
from app.db.session import get_db
from app.modules.bookings.schemas import (
    AvailabilityRead,
    BookingCreate,
    BookingRead,
    MyBookingRead,
    SlotRead,
)
from app.modules.notifications.service import send_booking_status_message

router = APIRouter(tags=["bookings"])

WORK_START = time(10, 0)
WORK_END = time(18, 0)


def _combine(day: date, value: time) -> datetime:
    return datetime.combine(day, value)


def _has_overlap(
    start_1: datetime,
    end_1: datetime,
    start_2: datetime,
    end_2: datetime,
) -> bool:
    return start_1 < end_2 and start_2 < end_1


async def _get_active_service(db: AsyncSession, service_id: int) -> Service:
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


async def _build_availability(
    db: AsyncSession,
    service: Service,
    day: date,
) -> AvailabilityRead:
    result = await db.execute(
        select(Booking)
        .where(
            Booking.booking_date == day,
            Booking.status != BookingStatus.CANCELLED,
        )
        .order_by(Booking.start_at.asc())
    )
    existing_bookings = result.scalars().all()

    duration = timedelta(minutes=service.duration_min)
    cursor_dt = _combine(day, WORK_START)
    work_end_dt = _combine(day, WORK_END)

    slots: list[SlotRead] = []

    while cursor_dt + duration <= work_end_dt:
        slot_end_dt = cursor_dt + duration
        is_available = True

        for booking in existing_bookings:
            existing_start_dt = _combine(day, booking.start_at)
            existing_end_dt = _combine(day, booking.end_at)

            if _has_overlap(
                cursor_dt,
                slot_end_dt,
                existing_start_dt,
                existing_end_dt,
            ):
                is_available = False
                break

        slots.append(
            SlotRead(
                start_at=cursor_dt.time(),
                end_at=slot_end_dt.time(),
                is_available=is_available,
            )
        )

        cursor_dt += duration

    return AvailabilityRead(date=day, slots=slots)


def _to_my_booking_read(booking: Booking) -> MyBookingRead:
    return MyBookingRead(
        id=booking.id,
        service_id=booking.service_id,
        service_title=booking.service.title,
        booking_date=booking.booking_date,
        start_at=booking.start_at,
        end_at=booking.end_at,
        phone=booking.phone,
        comment=booking.comment,
        status=booking.status,
    )


@router.get(
    "/services/{service_id}/availability",
    response_model=AvailabilityRead,
)
async def get_service_availability(
    service_id: int,
    day: date = Query(...),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    service = await _get_active_service(db, service_id)
    return await _build_availability(db, service, day)


@router.post(
    "/bookings",
    response_model=BookingRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_booking(
    payload: BookingCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = await _get_active_service(db, payload.service_id)
    availability = await _build_availability(db, service, payload.booking_date)

    selected_slot = next(
        (slot for slot in availability.slots if slot.start_at == payload.start_at),
        None,
    )

    if selected_slot is None:
        raise HTTPException(
            status_code=400,
            detail="Selected time is outside working hours",
        )

    if not selected_slot.is_available:
        raise HTTPException(
            status_code=400,
            detail="Selected time is already booked",
        )

    booking = Booking(
        user_id=current_user["id"],
        service_id=service.id,
        booking_date=payload.booking_date,
        start_at=selected_slot.start_at,
        end_at=selected_slot.end_at,
        phone=payload.phone,
        comment=payload.comment.strip() if payload.comment else None,
        status=BookingStatus.NEW,
    )

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    await send_booking_status_message(
        chat_id=current_user["telegram_id"],
        service_title=service.title,
        booking_date=booking.booking_date,
        start_at=booking.start_at,
        status=booking.status,
    )

    return booking


@router.get(
    "/bookings/me",
    response_model=list[MyBookingRead],
)
async def list_my_bookings(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.service))
        .where(Booking.user_id == current_user["id"])
        .order_by(Booking.booking_date.desc(), Booking.start_at.asc())
    )
    bookings = result.scalars().all()

    return [_to_my_booking_read(booking) for booking in bookings]


@router.patch(
    "/bookings/{booking_id}/cancel",
    response_model=MyBookingRead,
)
async def cancel_my_booking(
    booking_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.service))
        .where(
            Booking.id == booking_id,
            Booking.user_id == current_user["id"],
        )
    )
    booking = result.scalar_one_or_none()

    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == BookingStatus.CANCELLED:
        return _to_my_booking_read(booking)

    booking.status = BookingStatus.CANCELLED

    await db.commit()
    await db.refresh(booking)

    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.service))
        .where(Booking.id == booking.id)
    )
    booking = result.scalar_one()

    await send_booking_status_message(
        chat_id=current_user["telegram_id"],
        service_title=booking.service.title,
        booking_date=booking.booking_date,
        start_at=booking.start_at,
        status=booking.status,
    )

    return _to_my_booking_read(booking)