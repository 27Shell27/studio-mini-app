import { lazy, Suspense, useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { BookingPage } from "./pages/BookingPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { SuccessPage } from "./pages/SuccessPage";
import { bootstrapAccessToken } from "./shared/auth";
import { useTelegramApp } from "./shared/telegram";

{/*файл AdminPage.tsx не загружается сразу, а только при отерытии /admin */}
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({
    default: module.AdminPage,
  }))
);

export default function App() {
  useTelegramApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);

        await bootstrapAccessToken();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось подготовить авторизацию"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="screen">
        <div className="centered-block">Подготовка приложения...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="screen">
        <div className="centered-block error-block">{error}</div>
      </main>
    );
  }

  return (
    <HashRouter>
      <Suspense
        fallback={
          <main className="screen">
            <div className="centered-block">Загрузка раздела...</div>
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<ServicesPage />} />
          <Route path="/booking/:serviceId" element={<BookingPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}