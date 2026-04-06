from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.seed import seed_demo_services
from app.db.session import init_db
from app.modules.auth.router import router as auth_router
from app.modules.bookings.router import router as bookings_router
from app.modules.services.router import router as services_router
from app.modules.admin.router import router as admin_router

settings = get_settings()


app = FastAPI(title=settings.app_name)

# подключаем бэк 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(services_router, prefix=settings.api_prefix)
app.include_router(bookings_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)

@app.on_event("startup")
async def on_startup():
    await init_db()
    await seed_demo_services()


@app.get("/health")
async def health():
    return {"status": "ok"}