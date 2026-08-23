"""
SpecSense AI — FastAPI application entry point.

Startup sequence:
1. Database is initialized (tables created IF NOT EXISTS — safe, idempotent).
2. CORS middleware configured with explicit allowed origins.
3. Routes registered.

The database is NEVER dropped or recreated during startup.
Existing users are ALWAYS preserved.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.product_intelligence import router as product_router
from app.api.auth import router as auth_router
from app.config import settings
from app.database.connection import init_db, DB_PATH


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs init_db() on startup — idempotent, never destructive.
    """
    print(f"[SpecSense] Starting up — database: {DB_PATH}")
    init_db()
    print(f"[SpecSense] Database initialized (tables created if missing, existing data preserved).")
    yield
    print("[SpecSense] Shutting down.")


app = FastAPI(
    title="SpecSense AI - Product Intelligence",
    description="Enterprise AI Catalog Intelligence Platform API",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — explicit origins, no wildcard with credentials
# ---------------------------------------------------------------------------
cors_origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(product_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {
        "message": "Welcome to SpecSense AI Product Intelligence API",
        "version": "2.0.0",
        "status": "operational",
        "database": str(DB_PATH),
    }


@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    """
    Unauthenticated health check endpoint.
    Returns status: ok when backend is live and responsive.
    """
    return {
        "status": "ok",
        "version": "2.0.0",
        "service": "SpecSense AI Backend",
    }

