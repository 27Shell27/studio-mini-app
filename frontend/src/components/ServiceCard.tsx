import type { Service } from "../shared/types";

type Props = {
  service: Service;
  onBook: (serviceId: number) => void;
};

{/* отвечает за отображение услуги*/}
export function ServiceCard({ service, onBook }: Props) {
  return (
    <article className="card">
      <div className="card__content">
        <h2 className="card__title">{service.title}</h2>
        <p className="card__description">{service.description}</p>

        <div className="card__meta">
          <span>{service.duration_min} мин</span>
          <span>{service.price} ₽</span>
        </div>
      </div>

      <button className="primary-button" onClick={() => onBook(service.id)}>
        Записаться
      </button>
    </article>
  );
}