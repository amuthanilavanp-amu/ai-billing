"""Catalogue router — shared starter product catalogue"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import get_db
from models.catalogue_models import CatalogueCategory, CatalogueSubcategory, CatalogueItem
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


@router.get("/categories")
def list_catalogue_categories(
    business_category: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all top-level categories for a business category."""
    cats = (
        db.query(CatalogueCategory)
        .filter(
            CatalogueCategory.business_category == business_category,
            CatalogueCategory.is_active == True,
        )
        .order_by(CatalogueCategory.display_order)
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "item_count": len(c.items),
        }
        for c in cats
    ]


@router.get("/items")
def list_catalogue_items(
    business_category: str,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse catalogue items with filtering and pagination."""
    query = (
        db.query(CatalogueItem)
        .join(CatalogueCategory)
        .filter(
            CatalogueCategory.business_category == business_category,
            CatalogueItem.is_active == True,
        )
    )

    if category_id:
        query = query.filter(CatalogueItem.category_id == category_id)

    if subcategory_id:
        query = query.filter(CatalogueItem.subcategory_id == subcategory_id)

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(CatalogueItem.name).like(term),
                func.lower(CatalogueItem.tags).like(term),
            )
        )

    total = query.count()
    items = (
        query.order_by(CatalogueItem.category_id, CatalogueItem.display_order)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "category_id": item.category_id,
                "category_name": item.category.name if item.category else None,
                "subcategory_id": item.subcategory_id,
                "subcategory_name": item.subcategory.name if item.subcategory else None,
                "default_unit": item.default_unit,
                "is_vegetarian": item.is_vegetarian,
                "is_service": item.is_service,
                "tags": item.tags,
            }
            for item in items
        ],
    }


@router.get("/items/by-category/{category_id}")
def get_items_by_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all items in a category (for select-all-in-category)."""
    items = (
        db.query(CatalogueItem)
        .filter(
            CatalogueItem.category_id == category_id,
            CatalogueItem.is_active == True,
        )
        .order_by(CatalogueItem.display_order)
        .all()
    )
    return [
        {
            "id": item.id,
            "name": item.name,
            "default_unit": item.default_unit,
            "is_vegetarian": item.is_vegetarian,
            "is_service": item.is_service,
        }
        for item in items
    ]
