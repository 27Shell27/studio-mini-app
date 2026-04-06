from datetime import date, time

import httpx

from app.core.config import get_settings
from app.db.models import BookingStatus
#работу с Telegram-уведомлениями

def _status_label(status: BookingStatus) -> str:
    if status == BookingStatus.NEW:
        return "Ваша запись создана"
    if status == BookingStatus.CONFIRMED:
        return "Ваша запись подтверждена"
    if status == BookingStatus.CANCELLED:
        return "Ваша запись отменена"
    return "Статус записи обновлён"

#Отправка сообщений о брони 
async def send_telegram_message(chat_id: int, text: str) -> None:
    settings = get_settings()

    if not settings.telegram_bot_token or settings.telegram_bot_token == "dev-bot-token":
        print("Telegram notifications skipped: bot token is not configured")
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
    except Exception as exc:
        print(f"Telegram notification failed: {exc}")


async def send_booking_status_message(
    chat_id: int,
    service_title: str,
    booking_date: date,
    start_at: time,
    status: BookingStatus,
) -> None:
    status_text = _status_label(status)

    text = (
        f"{status_text}\n\n"
        f"Услуга: {service_title}\n"
        f"Дата: {booking_date.strftime('%d.%m.%Y')}\n"
        f"Время: {start_at.strftime('%H:%M')}"
    )

    await send_telegram_message(chat_id=chat_id, text=text)