"""Seed default roles — idempotent."""
from sqlalchemy.orm import Session


def seed_roles(db: Session) -> None:
    """Ensure default role config exists. Currently roles are stored as enum on User."""
    pass  # Roles are handled via UserRole enum, no separate table needed currently
