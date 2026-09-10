import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import Settings, get_settings
from app.database import close_database, connect_database
from app.routes import router
from app.services.events import EventBroker
from app.services.storage import build_storage
from app.services.summarizer import Summarizer

logger = logging.getLogger("medinotes.api")


def create_app(
    settings: Settings | None = None,
    *,
    database: Any | None = None,
    summarizer: Any | None = None,
    storage: Any | None = None,
) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if database is None:
            await connect_database(app, settings)
        else:
            app.state.db = database
        app.state.storage = storage or build_storage(settings)
        app.state.summarizer = summarizer or Summarizer(settings)
        app.state.events = EventBroker()
        yield
        if database is None:
            await close_database(app)

    app = FastAPI(
        title="MediNotes Pro API",
        version="1.0.0",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    app.dependency_overrides[get_settings] = lambda: settings
    limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    @app.middleware("http")
    async def phi_safe_access_log(request: Request, call_next):
        started = time.monotonic()
        response = await call_next(request)
        logger.info(
            "request method=%s route=%s status=%s duration_ms=%d user=%s",
            request.method,
            request.url.path,
            response.status_code,
            (time.monotonic() - started) * 1000,
            getattr(request.state, "user_hash", "anonymous"),
        )
        return response

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(router)
    return app


app = create_app()
