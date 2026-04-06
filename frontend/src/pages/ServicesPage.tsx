import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppTabs } from "../components/AppTabs";
import { ServiceCard } from "../components/ServiceCard";
import { api } from "../shared/api";
import type { Service } from "../shared/types";

export function ServicesPage() {
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        setLoading(true);
        setError(null);

        const result = await api.getServices();

        if (!cancelled) {
          setServices(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить услуги");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="screen">
        <AppTabs />
        <div className="centered-block">Загрузка услуг...</div>
      </main>
    );
  }

  if (error) {
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
        <p className="page-eyebrow">Mini App</p>
        <h1 className="page-title">Услуги</h1>
        <p className="page-subtitle">
          Выбери услугу и перейди к записи на удобное время.
        </p>
      </header>

      <section className="stack">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onBook={(serviceId) => navigate(`/booking/${serviceId}`)}
          />
        ))}
      </section>
    </main>
  );
}