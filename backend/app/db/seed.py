from sqlalchemy import select

from app.db.models import Service
from app.db.session import SessionLocal


async def seed_demo_services():
    async with SessionLocal() as session:
        result = await session.execute(select(Service.id).limit(1))
        if result.first() is not None:
            return

        session.add_all(
            [
                Service(
                    title="1 час аренды студии",
                    description="Базовая аренда студии на 60 минут.",
                    price=2000,
                    duration_min=60,
                    is_active=True,
                ),
                Service(
                    title="2 часа аренды студии",
                    description="Аренда студии на 120 минут со скидкой.",
                    price=3800,
                    duration_min=120,
                    is_active=True,
                ),
                Service(
                    title="Студия + базовый свет",
                    description="Аренда студии на 90 минут с базовым комплектом света.",
                    price=3000,
                    duration_min=90,
                    is_active=True,
                ),
            ]
        )
        await session.commit()