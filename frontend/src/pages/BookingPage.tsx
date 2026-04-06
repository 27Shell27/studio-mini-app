import {useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../shared/api";
import { getAccessToken } from "../shared/auth";
import {
  formatRussianPhoneInput,
  getRussianPhoneError,
  normalizeRussianPhoneForApi,
} from "../shared/phone";
import type { Availability, Service, Slot } from "../shared/types";

function getLocalDateInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatTimeLabel(timeValue: string) {
  return timeValue.slice(0, 5);
}

export function BookingPage() {
  const navigate = useNavigate();
  const params = useParams();

  const serviceId = Number(params.serviceId);

  const [service, setService] = useState<Service | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);

  const [bookingDate, setBookingDate] = useState(getLocalDateInputValue());
  const [selectedStartAt, setSelectedStartAt] = useState<string>("");

  const [phoneInput, setPhoneInput] = useState("");
  const [comment, setComment] = useState("");

  const [loadingService, setLoadingService] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const phoneError = getRussianPhoneError(phoneInput);

  useEffect(() => {
    let cancelled = false;

    async function loadService() {
      try {
        setLoadingService(true);
        setError(null);

        const result = await api.getService(serviceId);

        if (!cancelled) {
          setService(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить услугу");
        }
      } finally {
        if (!cancelled) {
          setLoadingService(false);
        }
      }
    }

    if (Number.isNaN(serviceId)) {
      setError("Некорректный идентификатор услуги");
      setLoadingService(false);
      return;
    }

    loadService();

    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!service) return;

      try {
        setLoadingAvailability(true);
        setError(null);
        setSelectedStartAt("");

        const result = await api.getAvailability(service.id, bookingDate);

        if (!cancelled) {
          setAvailability(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось загрузить свободные слоты"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [service, bookingDate]);

  const availableSlots = useMemo(() => {
    return availability?.slots ?? [];
  }, [availability]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!service) {
      setError("Услуга не загружена");
      return;
    }

    if (!selectedStartAt) {
      setError("Выбери свободное время");
      return;
    }

    const normalizedPhone = normalizeRussianPhoneForApi(phoneInput);

    if (!normalizedPhone) {
      setError("Укажи корректный российский номер");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = getAccessToken();

      const booking = await api.createBooking(token, {
        service_id: service.id,
        booking_date: bookingDate,
        start_at: selectedStartAt,
        phone: normalizedPhone,
        comment: comment.trim() || undefined,
      });

      const params = new URLSearchParams({
        service: service.title,
        date: booking.booking_date,
        time: booking.start_at,
        status: booking.status,
      });

      navigate(`/success?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать запись");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingService) {
    return (
      <main className="screen">
        <div className="centered-block">Загрузка услуги...</div>
      </main>
    );
  }

  if (error && !service) {
    return (
      <main className="screen">
        <div className="centered-block error-block">{error}</div>
      </main>
    );
  }

  return (
    <main className="screen">
      <button className="back-link" onClick={() => navigate("/")}>
        ← Назад к услугам
      </button>

      {service && (
        <>
          <header className="page-header">
            <p className="page-eyebrow">Запись</p>
            <h1 className="page-title">{service.title}</h1>
            <p className="page-subtitle">{service.description}</p>
            <div className="service-badges">
              <span>{service.duration_min} мин</span>
              <span>{service.price} ₽</span>
            </div>
          </header>

          <form className="stack" onSubmit={handleSubmit}>
            <section className="card">
              <label className="field">
                <span className="field__label">Дата</span>
                <input
                  className="input"
                  type="date"
                  value={bookingDate}
                  onChange={(event) => setBookingDate(event.target.value)}
                />
              </label>
            </section>

            <section className="card">
              <div className="field">
                <span className="field__label">Свободное время</span>

                {loadingAvailability ? (
                  <div className="muted-text">Загрузка слотов...</div>
                ) : (
                  <div className="slots-grid">
                    {availableSlots.map((slot: Slot) => (
                      <button
                        key={`${slot.start_at}-${slot.end_at}`}
                        type="button"
                        className={
                          "slot-button" +
                          (slot.is_available ? "" : " slot-button--disabled") +
                          (selectedStartAt === slot.start_at
                            ? " slot-button--selected"
                            : "")
                        }
                        disabled={!slot.is_available}
                        onClick={() => setSelectedStartAt(slot.start_at)}
                      >
                        {formatTimeLabel(slot.start_at)} — {formatTimeLabel(slot.end_at)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <label className="field">
                <span className="field__label">Телефон</span>
                <input
                  className="input"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={phoneInput}
                  onChange={(event) =>
                    setPhoneInput(formatRussianPhoneInput(event.target.value))
                  }
                />
                {phoneError ? (
                  <span className="field__hint field__hint--error">{phoneError}</span>
                ) : (
                  <span className="field__hint">
                    Только российские номера: +7 (999) 123-45-67
                  </span>
                )}
              </label>

              <label className="field">
                <span className="field__label">Комментарий</span>
                <textarea
                  className="textarea"
                  placeholder="Например: нужен дневной свет"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                />
              </label>
            </section>

            {error && <div className="error-block">{error}</div>}

            <button
              className="primary-button primary-button--full"
              disabled={submitting || !selectedStartAt || !phoneInput || !!phoneError}
            >
              {submitting ? "Создаём запись..." : "Подтвердить запись"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}