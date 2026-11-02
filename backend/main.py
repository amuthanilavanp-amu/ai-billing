"""
SmartBiz AI — FastAPI Backend
Local-first business management API running on 127.0.0.1
"""
import argparse
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from database import engine, Base, init_db
from routers import (
    auth,
    companies,
    products,
    catalogue,
    billing,
    inventory,
    purchases,
    expenses,
    customers,
    suppliers,
    reports,
    analytics,
    forecasting,
    assistant,
    import_export,
    settings,
    backup,
)

# ─── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("smartbiz")

# ─── Data Directory ────────────────────────────────────────────────────────────

DATA_DIR = Path(
    os.environ.get("SMARTBIZ_DATA_DIR", Path.home() / "AppData" / "Roaming" / "SmartBizAI")
)
DATA_DIR.mkdir(parents=True, exist_ok=True)
os.environ["SMARTBIZ_DATA_DIR"] = str(DATA_DIR)

# ─── App Lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"SmartBiz AI backend starting. Data dir: {DATA_DIR}")
    init_db()
    logger.info("Application startup complete")
    yield
    logger.info("SmartBiz AI backend shutting down")

# ─── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="SmartBiz AI API",
    description="Local backend for SmartBiz AI desktop billing software",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS — only allow localhost (Electron renderer)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8765",
        "http://127.0.0.1:8765",
        "file://",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───────────────────────────────────────────────────────────────────

API = "/api/v1"

app.include_router(auth.router,          prefix=f"{API}/auth",         tags=["Auth"])
app.include_router(companies.router,     prefix=f"{API}/companies",    tags=["Companies"])
app.include_router(products.router,      prefix=f"{API}/products",     tags=["Products"])
app.include_router(catalogue.router,     prefix=f"{API}/catalogue",    tags=["Catalogue"])
app.include_router(import_export.router, prefix=f"{API}/import-export", tags=["Import/Export"])
app.include_router(import_export.router, prefix=f"{API}/import",        tags=["Import/Export"])
app.include_router(billing.router,       prefix=f"{API}/billing",      tags=["Billing"])
app.include_router(inventory.router,     prefix=f"{API}/inventory",    tags=["Inventory"])
app.include_router(purchases.router,     prefix=f"{API}/purchases",    tags=["Purchases"])
app.include_router(expenses.router,      prefix=f"{API}/expenses",     tags=["Expenses"])
app.include_router(customers.router,     prefix=f"{API}/customers",    tags=["Customers"])
app.include_router(suppliers.router,     prefix=f"{API}/suppliers",    tags=["Suppliers"])
app.include_router(reports.router,       prefix=f"{API}/reports",      tags=["Reports"])
app.include_router(analytics.router,     prefix=f"{API}/analytics",    tags=["Analytics"])
app.include_router(forecasting.router,   prefix=f"{API}/forecasting",  tags=["Forecasting"])
app.include_router(assistant.router,     prefix=f"{API}/assistant",    tags=["Assistant"])
app.include_router(settings.router,      prefix=f"{API}/settings",     tags=["Settings"])
app.include_router(backup.router,        prefix=f"{API}/backup",       tags=["Backup"])

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "SmartBiz AI", "version": "1.0.0"}

# ─── Serve Frontend UI at Root ────────────────────────────────────────────────
DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")

# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=False,
        log_level="info",
    )
