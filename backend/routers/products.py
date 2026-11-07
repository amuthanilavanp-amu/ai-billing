"""
Products router — business-specific product management
"""
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from database import get_db
from models.product_models import BusinessProduct, ProductCategory, Brand, ProductVariant, ProductStatus, ProductType, TaxType
from models.inventory_models import InventoryMovement, MovementType
from models.catalogue_models import CatalogueItem
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    product_type: str = "product"
    sku: Optional[str] = None
    barcode: Optional[str] = None
    hsn_sac_code: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: float = 0.0
    mrp: Optional[float] = None
    unit: str = "Pcs"
    tax_type: str = "gst"
    gst_rate: float = 0.0
    tax_inclusive: bool = False
    opening_stock: float = 0.0
    reorder_level: float = 0.0
    reorder_quantity: float = 0.0
    track_inventory: bool = True
    is_vegetarian: Optional[bool] = None
    catalogue_item_id: Optional[int] = None


class ProductUpdate(ProductCreate):
    pass


class CatalogueImportRequest(BaseModel):
    """Import products from shared catalogue into business inventory."""
    catalogue_item_ids: List[int]
    default_selling_price: Optional[float] = None


@router.get("")
def list_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        return {"total": 0, "items": []}

    query = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == current_user.company_id
    )

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(BusinessProduct.name).like(term),
                func.lower(BusinessProduct.sku).like(term),
                func.lower(BusinessProduct.barcode).like(term),
            )
        )

    if category_id:
        query = query.filter(BusinessProduct.category_id == category_id)

    if status:
        try:
            query = query.filter(BusinessProduct.status == ProductStatus(status))
        except ValueError:
            pass

    if product_type:
        try:
            query = query.filter(BusinessProduct.product_type == ProductType(product_type))
        except ValueError:
            pass

    total = query.count()
    products = (
        query.order_by(BusinessProduct.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_product_to_dict(p) for p in products],
    }


@router.post("")
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company associated")

    # Check for duplicate barcode
    if data.barcode:
        existing = db.query(BusinessProduct).filter(
            BusinessProduct.company_id == current_user.company_id,
            BusinessProduct.barcode == data.barcode,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Barcode {data.barcode} already exists for product '{existing.name}'")

    product = BusinessProduct(
        company_id=current_user.company_id,
        **data.model_dump(exclude_none=True),
    )
    db.add(product)
    db.flush()

    # Record opening stock movement
    if data.opening_stock and data.opening_stock > 0:
        movement = InventoryMovement(
            company_id=current_user.company_id,
            product_id=product.id,
            movement_type=MovementType.OPENING,
            quantity=data.opening_stock,
            stock_before=0.0,
            stock_after=data.opening_stock,
            notes="Opening stock",
            created_by=current_user.id,
        )
        product.current_stock = data.opening_stock
        db.add(movement)

    db.commit()
    db.refresh(product)
    return _product_to_dict(product)


@router.get("/{product_id}")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = _get_product_or_404(product_id, current_user.company_id, db)
    return _product_to_dict(product)


@router.put("/{product_id}")
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = _get_product_or_404(product_id, current_user.company_id, db)

    # Check barcode uniqueness if changing
    if data.barcode and data.barcode != product.barcode:
        existing = db.query(BusinessProduct).filter(
            BusinessProduct.company_id == current_user.company_id,
            BusinessProduct.barcode == data.barcode,
            BusinessProduct.id != product_id,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Barcode {data.barcode} already used by '{existing.name}'")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(product, field, value)

    db.commit()
    return _product_to_dict(product)


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = _get_product_or_404(product_id, current_user.company_id, db)
    product.status = ProductStatus.DISCONTINUED
    db.commit()
    return {"success": True}


@router.get("/barcode/{barcode}")
def find_by_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find a product by barcode scan — used by billing with multi-format matching."""
    if not current_user.company_id:
        return None
    cleaned = barcode.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Barcode cannot be empty")

    candidates = [cleaned]
    if len(cleaned) == 13 and cleaned.startswith("0"):
        candidates.append(cleaned[1:])
    elif len(cleaned) == 12:
        candidates.append("0" + cleaned)

    lower_candidates = [c.lower() for c in candidates]

    # Primary search: exact or normalized barcode or SKU
    product = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == current_user.company_id,
        BusinessProduct.status != ProductStatus.DISCONTINUED,
        or_(
            BusinessProduct.barcode.in_(candidates),
            BusinessProduct.sku.in_(candidates),
            func.lower(BusinessProduct.barcode).in_(lower_candidates),
            func.lower(BusinessProduct.sku).in_(lower_candidates),
        ),
    ).first()

    # Fallback search: partial match or matching product name
    if not product:
        product = db.query(BusinessProduct).filter(
            BusinessProduct.company_id == current_user.company_id,
            BusinessProduct.status != ProductStatus.DISCONTINUED,
            or_(
                BusinessProduct.barcode.ilike(f"%{cleaned}%"),
                BusinessProduct.sku.ilike(f"%{cleaned}%"),
                BusinessProduct.name.ilike(f"{cleaned}%"),
            ),
        ).first()

    if not product:
        raise HTTPException(status_code=404, detail=f"No product found for barcode: {barcode}")
    return _product_to_dict(product)


@router.post("/import-from-catalogue")
def import_from_catalogue(
    data: CatalogueImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import selected catalogue items into the business's product list."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company associated")

    imported = []
    skipped = []
    errors = []

    for cat_item_id in data.catalogue_item_ids:
        cat_item = db.query(CatalogueItem).filter(CatalogueItem.id == cat_item_id).first()
        if not cat_item:
            errors.append({"id": cat_item_id, "error": "Catalogue item not found"})
            continue

        # Check if already imported
        existing = db.query(BusinessProduct).filter(
            BusinessProduct.company_id == current_user.company_id,
            BusinessProduct.catalogue_item_id == cat_item_id,
        ).first()

        if existing:
            skipped.append({"id": cat_item_id, "name": cat_item.name, "reason": "already imported"})
            continue

        product = BusinessProduct(
            company_id=current_user.company_id,
            catalogue_item_id=cat_item_id,
            name=cat_item.name,
            unit=cat_item.default_unit or "Pcs",
            selling_price=data.default_selling_price or 0.0,
            product_type=ProductType.SERVICE if cat_item.is_service else ProductType.PRODUCT,
            is_vegetarian=cat_item.is_vegetarian,
            track_inventory=not cat_item.is_service,
        )
        db.add(product)
        imported.append(cat_item.name)

    db.commit()
    return {
        "imported": len(imported),
        "skipped": len(skipped),
        "errors": len(errors),
        "imported_names": imported,
        "skipped_items": skipped,
        "error_items": errors,
    }


@router.get("/categories/list")
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        return []
    cats = db.query(ProductCategory).filter(
        ProductCategory.company_id == current_user.company_id,
        ProductCategory.is_active == True,
    ).all()
    return [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in cats]


@router.post("/categories")
def create_category(
    name: str,
    parent_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")
    cat = ProductCategory(company_id=current_user.company_id, name=name, parent_id=parent_id)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "name": cat.name}


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _get_product_or_404(product_id: int, company_id: Optional[int], db: Session) -> BusinessProduct:
    product = db.query(BusinessProduct).filter(
        BusinessProduct.id == product_id,
        BusinessProduct.company_id == company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def _product_to_dict(p: BusinessProduct) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "category_id": p.category_id,
        "category_name": p.category.name if p.category else None,
        "brand_id": p.brand_id,
        "product_type": p.product_type.value,
        "status": p.status.value,
        "sku": p.sku,
        "barcode": p.barcode,
        "hsn_sac_code": p.hsn_sac_code,
        "purchase_price": p.purchase_price,
        "selling_price": p.selling_price,
        "mrp": p.mrp,
        "unit": p.unit,
        "tax_type": p.tax_type.value,
        "gst_rate": p.gst_rate,
        "tax_inclusive": p.tax_inclusive,
        "tax_verified": p.tax_verified,
        "current_stock": p.current_stock,
        "opening_stock": p.opening_stock,
        "reorder_level": p.reorder_level,
        "reorder_quantity": p.reorder_quantity,
        "track_inventory": p.track_inventory,
        "is_vegetarian": p.is_vegetarian,
        "catalogue_item_id": p.catalogue_item_id,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
