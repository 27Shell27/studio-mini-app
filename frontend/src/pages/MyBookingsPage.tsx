import { useEffect, useState } from "react";

import { AppTabs } from "../components/AppTabs";
import { BookingItemCard } from "../components/BookingItemCard";
import { api } from "../shared/api";
import { getAccessToken } from "../shared/auth";
import type { MyBooking } from "../shared/types";

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBookings() {
      try {
        setLoading(true);
        setError(null);

        const token = getAccessToken();
        const result = await api.getMyBookings(token);

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
  }, []);

  async function handleCancel(bookingId: number) {
    const confirmed = window.confirm("Отменить эту запись?");
    if (!confirmed) return;

    try {
      setCancellingId(bookingId);
      setError(null);

      const token = getAccessToken();
      const updatedBooking = await api.cancelBooking(token, bookingId);

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? updatedBooking : booking
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить запись");
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <main className="screen">
        <AppTabs />
        <div className="centered-block">Загрузка записей...</div>
      </main>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <main className="screen">
        <AppTabs />
        <div className="centered-block error-block">{error}</div>
      </main>
    );
  }

  return (
    <main className="screen">
      <AppTabs />

      <header className="page-header">
        <p className="page-eyebrow">Личный кабинет</p>
        <h1 className="page-title">Мои записи</h1>
        <p className="page-subtitle">
          Здесь отображаются все созданные записи текущего пользователя.
        </p>
      </header>

      {error && <div className="error-block">{error}</div>}

      {bookings.length === 0 ? (
        <div className="centered-block">У тебя пока нет записей.</div>
      ) : (
        <section className="stack">
          {bookings.map((booking) => (
            <BookingItemCard
              key={booking.id}
              booking={booking}
              onCancel={handleCancel}
              cancelling={cancellingId === booking.id}
            />
          ))}
        </section>
      )}
    </main>
  );
}