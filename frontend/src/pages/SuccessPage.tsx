import { useNavigate, useSearchParams } from "react-router-dom";

function formatTimeLabel(timeValue: string) {
  return timeValue.slice(0, 5);
}

export function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const service = searchParams.get("service") ?? "Услуга";
  const date = searchParams.get("date") ?? "";
  const time = searchParams.get("time") ?? "";
  const status = searchParams.get("status") ?? "new";

  return (
    <main className="screen">
      <section className="success-card">
        <p className="page-eyebrow">Готово</p>
        <h1 className="page-title">Запись создана</h1>

        <div className="success-summary">
          <div>
            <span className="muted-text">Услуга</span>
            <strong>{service}</strong>
          </div>

          <div>
            <span className="muted-text">Дата</span>
            <strong>{date}</strong>
          </div>

          <div>
            <span className="muted-text">Время</span>
            <strong>{time ? formatTimeLabel(time) : "-"}</strong>
          </div>

          <div>
            <span className="muted-text">Статус</span>
            <strong>{status}</strong>
          </div>
        </div>

        <p className="page-subtitle">
          Если Telegram-бот настроен, пользователь получит сообщение о статусе записи.
        </p>

        <div className="stack">
          <button
            className="primary-button primary-button--full"
            onClick={() => navigate("/my-bookings")}
          >
            Перейти в мои записи
          </button>

          <button
            className="secondary-button primary-button--full"
            onClick={() => navigate("/")}
          >
            Вернуться к услугам
          </button>
        </div>
      </section>
    </main>
  );
}