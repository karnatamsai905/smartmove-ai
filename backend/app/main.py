import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import vehicles, drivers, deliveries, optimization, scenarios, ai, driver, analytics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="SmartMove AI API",
        description="AI-powered smart delivery and route optimization platform",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:5174"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(vehicles.router, prefix="/api/vehicles", tags=["vehicles"])
    app.include_router(drivers.router, prefix="/api/drivers", tags=["drivers"])
    app.include_router(deliveries.router, prefix="/api/deliveries", tags=["deliveries"])
    app.include_router(optimization.router, prefix="/api/optimization", tags=["optimization"])
    app.include_router(scenarios.router, prefix="/api/scenarios", tags=["scenarios"])
    app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
    app.include_router(driver.router, prefix="/api/driver", tags=["driver"])
    app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "SmartMove AI API"}

    return app


app = create_app()
