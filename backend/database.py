"""
Database configuration and session management
"""
import os
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from sqlalchemy.pool import StaticPool

# ─── Data Directory ────────────────────────────────────────────────────────────

DATA_DIR = Path(
    os.environ.get("SMARTBIZ_DATA_DIR", Path.home() / "AppData" / "Roaming" / "SmartBizAI")
)
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "smartbiz.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# ─── Engine ────────────────────────────────────────────────────────────────────

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,
    },
    poolclass=StaticPool,
    echo=False,
)

# Enable WAL mode and foreign keys for every connection
@event.listens_for(engine, "connect")
def configure_sqlite(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA temp_store=MEMORY")
    cursor.execute("PRAGMA cache_size=-64000")  # 64MB
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ─── Base ──────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass

# ─── Dependency ────────────────────────────────────────────────────────────────

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── Init ──────────────────────────────────────────────────────────────────────

def init_db():
    """Create all tables and seed starter data."""
    from models import (
        user_models,
        company_models,
        catalogue_models,
        product_models,
        customer_models,
        supplier_models,
        invoice_models,
        inventory_models,
        purchase_models,
        expense_models,
        analytics_models,
    )

    Base.metadata.create_all(bind=engine)

    # Seed starter data
    db = SessionLocal()
    try:
        from seeds.seed_catalogue import seed_catalogue
        from seeds.seed_roles import seed_roles
        seed_roles(db)
        seed_catalogue(db)
        db.commit()
    except Exception as e:
        import logging
        logging.getLogger("smartbiz").error(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()
