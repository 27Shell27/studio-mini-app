import type { MyBooking } from "../shared/types";

type Props = {
  booking: MyBooking;
  onCancel?: (bookingId: number) => void;
  cancelling?: boolean;
};

function formatTimeLabel(timeValue: string) {
  return timeValue.slice(0, 5);
}

function getStatusLabel(status: MyBooking["status"]) {
  if (status === "new") return "Ожидает подтверждения";
  if (status === "confirmed") return "Подтверждена";
  if (status === "cancelled") return "Отменена";
  return status;
}

export function BookingItemCard({
  booking,
  onCancel,
  cancelling = false,
}: Props) {
  const canCancel =
    booking.status === "new" || booking.status === "confirmed";

  return (
    <article className="card">
      <div className="booking-card__top">
        <h2 className="card__title">{booking.service_title}</h2>
        <span className={`status-badge status-badge--${booking.status}`}>
          {getStatusLabel(booking.status)}
        </span>
      </div>

      <div className="booking-card__meta">
        <div>
          <span className="muted-text">Дата</span>
          <strong>{booking.booking_date}</strong>
        </div>

        <div>
          <span className="muted-text">Время</span>
          <strong>
            {formatTimeLabel(booking.start_at)} — {formatTimeLabel(booking.end_at)}
          </strong>
        </div>

        <div>
          <span className="muted-text">Телефон</span>
          <strong>{booking.phone}</strong>
        </div>

        {booking.comment && (
          <div>
            <span className="muted-text">Комментарий</span>
            <strong>{booking.comment}</strong>
          </div>
        )}
      </div>

      {canCancel && onCancel && (
        <div className="booking-card__actions">
          <button
            type="button"
            className="secondary-button"
            disabled={cancelling}
            onClick={() => onCancel(booking.id)}
          >
            {cancelling ? "Отменяем..." : "Отменить запись"}
          </button>
        </div>
      )}
    </article>
  );
}