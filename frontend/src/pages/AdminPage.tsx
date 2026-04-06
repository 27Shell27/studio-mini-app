import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../shared/api";
import { getAccessToken } from "../shared/auth";
import type { AdminBooking, BookingStatus } from "../shared/types";

function formatTimeLabel(timeValue: string) {
  return timeValue.slice(0, 5);
}

function getStatusLabel(status: BookingStatus) {
  if (status === "new") return "Ожидает подтверждения";
  if (status === "confirmed") return "Подтверждена";
  if (status === "cancelled") return "Отменена";
  return status;
}

export function AdminPage() {
  const [filter, setFilter] = useState<BookingStatus | "all">("new");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBookings() {
      try {
        setLoading(true);
        setError(null);

        const token = getAccessToken();
        const result = await api.getAdminBookings(token, filter);

        if (!cancelled) {
          setBookings(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить записи");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function handleStatusUpdate(
    bookingId: number,
    nextStatus: Exclude<BookingStatus, "new">
  ) {
    try {
      setUpdatingId(bookingId);
      setError(null);

      const token = getAccessToken();
      const updated = await api.updateAdminBookingStatus(token, bookingId, nextStatus);

      setBookings((prev) =>
        prev.map((booking) => (booking.id === bookingId ? updated : booking))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить статус");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="screen">
      <button className="back-link" onClick={() => window.history.back()}>
        ← Назад
      </button>

      <header className="page-header">
        <p className="page-eyebrow">Admin</p>
        <h1 className="page-title">Админ-панель</h1>
        <p className="page-subtitle">
          Подтверждай записи, отменяй их и отслеживай текущие статусы.
        </p>
      </header>

      <section className="card admin-toolbar">
        <div className="admin-filter-group">
          <button
            className={"secondary-button" + (filter === "all" ? " admin-filter--active" : "")}
            onClick={() => setFilter("all")}
          >
            Все
          </button>
          <button
            className={"secondary-button" + (filter === "new" ? " admin-filter--active" : "")}
            onClick={() => setFilter("new")}
          >
            Новые
          </button>
          <button
            className={
              "secondary-button" + (filter === "confirmed" ? " admin-filter--active" : "")
            }
            onClick={() => setFilter("confirmed")}
          >
            Подтверждённые
          </button>
          <button
            className={
              "secondary-button" + (filter === "cancelled" ? " admin-filter--active" : "")
            }
            onClick={() => setFilter("cancelled")}
          >
            Отменённые
          </button>
        </div>
      </section>

      {loading && <div className="centered-block">Загрузка записей...</div>}
      {error && <div className="error-block">{error}</div>}

      {!loading && bookings.length === 0 && (
        <div className="centered-block">Записей по этому фильтру нет.</div>
      )}

      <section className="stack">
        {bookings.map((booking) => (
          <article className="card" key={booking.id}>
            <div className="booking-card__top">
              <h2 className="card__title">{booking.service_title}</h2>
              <span className={`status-badge status-badge--${booking.status}`}>
                {getStatusLabel(booking.status)}
              </span>
            </div>

            <div className="booking-card__meta">
              <div>
                <span className="muted-text">Пользователь</span>
                <strong>
                  {booking.user_first_name}
                  {booking.user_username ? ` (@${booking.user_username})` : ""}
                </strong>
              </div>

              <div>
                <span className="muted-text">Telegram ID</span>
                <strong>{booking.user_telegram_id}</strong>
              </div>

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

            <div className="admin-actions">
              <button
                className="primary-button"
                disabled={booking.status === "confirmed" || updatingId === booking.id}
                onClick={() => handleStatusUpdate(booking.id, "confirmed")}
              >
                {updatingId === booking.id ? "Сохраняем..." : "Подтвердить"}
              </button>

              <button
                className="secondary-button"
                disabled={booking.status === "cancelled" || updatingId === booking.id}
                onClick={() => handleStatusUpdate(booking.id, "cancelled")}
              >
                Отменить
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}