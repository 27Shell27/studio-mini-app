import re
from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models import BookingStatus

RUSSIAN_PHONE_RE = re.compile(r"^\+7\d{10}$")


def normalize_russian_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)

    if len(digits) == 10:
        digits = f"7{digits}"
    elif len(digits) == 11 and digits[0] in {"7", "8"}:
        digits = f"7{digits[1:]}"
    else:
        raise ValueError("Phone must be a Russian number in format +7XXXXXXXXXX")

    normalized = f"+{digits}"

    if not RUSSIAN_PHONE_RE.fullmatch(normalized):
        raise ValueError("Phone must be a Russian number in format +7XXXXXXXXXX")

    return normalized


class SlotRead(BaseModel):
    start_at: time
    end_at: time
    is_available: bool = True


class AvailabilityRead(BaseModel):
    date: date
    slots: list[SlotRead]


class BookingCreate(BaseModel):
    service_id: int
    booking_date: date
    start_at: time
    phone: str = Field(min_length=5, max_length=32)
    comment: str | None = Field(default=None, max_length=500)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_russian_phone(value)


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    service_id: int
    booking_date: date
    start_at: time
    end_at: time
    phone: str
    comment: str | None
    status: BookingStatus


class MyBookingRead(BaseModel):
    id: int
    service_id: int
    service_title: str
    booking_date: date
    start_at: time
    end_at: time
    phone: str
    comment: str | None
    status: BookingStatus


class BookingStatusUpdate(BaseModel):
    status: BookingStatus

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: BookingStatus) -> BookingStatus:
        if value == BookingStatus.NEW:
            raise ValueError("Admin cannot set status back to NEW")
        return value


class AdminBookingRead(BaseModel):
    id: int
    service_id: int
    service_title: str
    booking_date: date
    start_at: time
    end_at: time
    phone: str
    comment: str | None
    status: BookingStatus

    user_id: int
    user_first_name: str
    user_username: str | None
    user_telegram_id: int