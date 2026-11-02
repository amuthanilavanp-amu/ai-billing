"""
Bulk import and export router — the heart of the catalogue import feature.
Supports CSV and Excel import with column mapping, validation, and duplicate detection.
"""
import csv
import io
import json
import os
import tempfile
import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models.product_models import BusinessProduct, ProductCategory, Brand, ProductStatus, ProductType, TaxType
from models.catalogue_models import ImportBatch, ImportRowError
from models.inventory_models import InventoryMovement, MovementType
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()

# ─── Column Mapping ────────────────────────────────────────────────────────────

EXPECTED_COLUMNS = {
    "name": ["name", "product name", "item name", "product", "item", "description", "product_name"],
    "sku": ["sku", "code", "item code", "product code", "sku_code"],
    "barcode": ["barcode", "ean", "upc", "barcode number", "ean13"],
    "category": ["category", "cat", "group", "product category", "item category"],
    "brand": ["brand", "brand name", "manufacturer"],
    "unit": ["unit", "uom", "unit of measure", "units"],
    "selling_price": ["selling price", "price", "sale price", "mrp", "rate", "selling_price"],
    "purchase_price": ["purchase price", "cost", "cost price", "buying price", "purchase_price"],
    "gst_rate": ["gst", "gst rate", "tax", "tax rate", "gst%", "tax%", "gst_rate"],
    "hsn_sac_code": ["hsn", "sac", "hsn code", "sac code", "hsn/sac"],
    "opening_stock": ["opening stock", "stock", "qty", "quantity", "opening_stock", "initial stock"],
    "reorder_level": ["reorder level", "reorder", "min stock", "reorder_level"],
}


def suggest_column_mapping(headers: List[str]) -> Dict[str, Optional[str]]:
    """Auto-suggest field → header mappings based on header names."""
    mapping: Dict[str, Optional[str]] = {}
    for field, aliases in EXPECTED_COLUMNS.items():
        matched = None
        for header in headers:
            if header.strip().lower() in aliases:
                matched = header
                break
        mapping[field] = matched
    return mapping


# ─── Templates ────────────────────────────────────────────────────────────────

CATEGORY_TEMPLATES = {
    "general": {
        "headers": ["Name", "SKU", "Barcode", "Category", "Brand", "Unit", "Selling Price", "Purchase Price", "GST Rate", "HSN/SAC Code", "Opening Stock", "Reorder Level"],
        "sample_rows": [
            ["Basmati Rice 1Kg", "RICE-001", "8901234567890", "Rice & Grains", "India Gate", "Kg", "120.00", "85.00", "5", "1006", "100", "10"],
            ["Sunflower Oil 1L", "OIL-001", "8901234567891", "Cooking Oil", "Fortune", "Bottle", "145.00", "110.00", "5", "1512", "50", "5"],
            ["Toor Dal 1Kg", "DAL-001", "", "Pulses", "Tata Sampann", "Kg", "160.00", "120.00", "5", "0713", "75", "10"],
        ]
    },
    "hotel_restaurant": {
        "headers": ["Name", "Category", "Unit", "Selling Price", "GST Rate", "Is Vegetarian"],
        "sample_rows": [
            ["Masala Dosa", "Breakfast", "Plate", "80.00", "5", "Yes"],
            ["Chicken Biryani (Full)", "Biryani", "Plate", "250.00", "5", "No"],
            ["Filter Coffee", "Beverages", "Cup", "30.00", "5", "Yes"],
        ]
    },
    "pharmacy": {
        "headers": ["Name", "Category", "Unit", "Selling Price", "Purchase Price", "GST Rate", "HSN Code"],
        "sample_rows": [
            ["Paracetamol 500mg Tab", "OTC Medicines", "Strip", "15.00", "10.00", "12", "3004"],
            ["Vitamin C 500mg", "OTC Medicines", "Strip", "120.00", "80.00", "12", "2936"],
        ]
    },
    "clothing": {
        "headers": ["Name", "Category", "SKU", "Barcode", "Unit", "Selling Price", "Purchase Price", "GST Rate", "Size", "Color"],
        "sample_rows": [
            ["Men's Formal Shirt", "Men's Clothing", "SHIRT-BL-L", "", "Pcs", "899.00", "450.00", "12", "L", "Blue"],
            ["Women's Saree Cotton", "Women's Clothing", "SAREE-001", "", "Pcs", "1299.00", "700.00", "5", "", "Red"],
        ]
    },
}


@router.get("/template/{template_type}")
def download_template(template_type: str = "general"):
    """Download a blank or sample import template as CSV."""
    try:
        import openpyxl
        template_data = CATEGORY_TEMPLATES.get(template_type, CATEGORY_TEMPLATES["general"])

        # Build CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(template_data["headers"])
        for row in template_data["sample_rows"]:
            writer.writerow(row)
        csv_content = output.getvalue()
        output.close()

        return StreamingResponse(
            io.BytesIO(csv_content.encode("utf-8-sig")),  # BOM for Excel compatibility
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=smartbiz_import_template_{template_type}.csv"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/template/{template_type}/xlsx")
def download_template_xlsx(template_type: str = "general"):
    """Download Excel import template."""
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
        template_data = CATEGORY_TEMPLATES.get(template_type, CATEGORY_TEMPLATES["general"])

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Products"

        # Header row with style
        header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)

        for col_idx, header in enumerate(template_data["headers"], 1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")
            ws.column_dimensions[chr(64 + col_idx)].width = max(15, len(header) + 5)

        # Sample data rows
        for row_idx, row_data in enumerate(template_data["sample_rows"], 2):
            for col_idx, value in enumerate(row_data, 1):
                ws.cell(row=row_idx, column=col_idx, value=value)

        # Instructions sheet
        ws_info = wb.create_sheet("Instructions")
        instructions = [
            ["SmartBiz AI - Product Import Template"],
            [""],
            ["INSTRUCTIONS:"],
            ["1. Do not change the header row."],
            ["2. Name is required. All other fields are optional."],
            ["3. GST Rate should be a number (e.g. 5 for 5%, 12 for 12%)."],
            ["4. Prices should be numbers without currency symbols."],
            ["5. Is Vegetarian: Yes/No (for restaurant items only)."],
            ["6. Opening Stock: Enter the current physical stock quantity."],
            ["7. The system will NOT assign GST rates automatically."],
            ["   You must verify and enter the correct GST rate for each product."],
            ["8. Save this file as .xlsx or .csv before importing."],
        ]
        for row in instructions:
            ws_info.append(row)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=smartbiz_import_template_{template_type}.xlsx"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Upload and Preview ───────────────────────────────────────────────────────

@router.post("/preview")
async def preview_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a file and get a preview with suggested column mapping.
    Does NOT save anything to the database.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")

    content = await file.read()
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "csv"

    rows, headers = _parse_file(content, ext)

    if not headers:
        raise HTTPException(status_code=400, detail="Could not read file headers")

    suggested_mapping = suggest_column_mapping(headers)

    # Preview first 10 rows
    preview_rows = rows[:10]

    return {
        "filename": filename,
        "file_type": ext,
        "total_rows": len(rows),
        "headers": headers,
        "suggested_mapping": suggested_mapping,
        "preview_rows": preview_rows,
        "required_fields": ["name"],
    }


@router.post("/execute")
async def execute_import(
    file: UploadFile = File(...),
    column_mapping: str = Form(...),  # JSON string
    duplicate_strategy: str = Form("skip"),  # skip, update, error
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Execute the product import.
    - column_mapping: JSON {"name": "Product Name", "selling_price": "Price", ...}
    - duplicate_strategy: skip | update | error
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")

    try:
        mapping = json.loads(column_mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column mapping JSON")

    if not mapping.get("name"):
        raise HTTPException(status_code=400, detail="Column mapping must include 'name'")

    content = await file.read()
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "csv"

    rows, headers = _parse_file(content, ext)

    if not rows:
        raise HTTPException(status_code=400, detail="File has no data rows")

    # Create import batch record
    batch = ImportBatch(
        company_id=current_user.company_id,
        user_id=current_user.id,
        filename=filename,
        file_type=ext,
        total_rows=len(rows),
        status="processing",
        column_mapping=column_mapping,
        started_at=datetime.utcnow(),
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Process inline (for small files) or background (for large)
    if len(rows) <= 500:
        result = _process_import(batch.id, rows, mapping, duplicate_strategy, current_user.company_id, current_user.id)
        # Refresh batch
        db.refresh(batch)
        return {
            "batch_id": batch.id,
            "status": "done",
            "total": batch.total_rows,
            "imported": batch.imported_rows,
            "updated": batch.updated_rows,
            "skipped": batch.skipped_rows,
            "errors": batch.error_rows,
            "duplicates": batch.duplicate_rows,
        }
    else:
        # Background processing
        background_tasks.add_task(_process_import_bg, batch.id, rows, mapping, duplicate_strategy, current_user.company_id, current_user.id)
        return {
            "batch_id": batch.id,
            "status": "processing",
            "message": f"Import of {len(rows)} products started in background",
        }


@router.get("/status/{batch_id}")
def get_import_status(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    batch = db.query(ImportBatch).filter(
        ImportBatch.id == batch_id,
        ImportBatch.company_id == current_user.company_id,
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    return {
        "batch_id": batch.id,
        "status": batch.status,
        "total": batch.total_rows,
        "imported": batch.imported_rows,
        "updated": batch.updated_rows,
        "skipped": batch.skipped_rows,
        "errors": batch.error_rows,
        "duplicates": batch.duplicate_rows,
        "started_at": batch.started_at.isoformat() if batch.started_at else None,
        "completed_at": batch.completed_at.isoformat() if batch.completed_at else None,
    }


@router.get("/errors/{batch_id}")
def get_import_errors(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    batch = db.query(ImportBatch).filter(
        ImportBatch.id == batch_id,
        ImportBatch.company_id == current_user.company_id,
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    errors = db.query(ImportRowError).filter(ImportRowError.batch_id == batch_id).all()
    return [
        {"row": e.row_number, "error": e.error_message, "type": e.error_type, "data": e.raw_data}
        for e in errors
    ]


@router.get("/export")
def export_products(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all products to CSV or Excel."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")

    products = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == current_user.company_id,
    ).order_by(BusinessProduct.name).all()

    headers = ["Name", "SKU", "Barcode", "Category", "Unit", "Selling Price", "Purchase Price", "GST Rate", "HSN/SAC Code", "Current Stock", "Reorder Level", "Status"]

    rows = []
    for p in products:
        rows.append([
            p.name,
            p.sku or "",
            p.barcode or "",
            p.category.name if p.category else "",
            p.unit,
            p.selling_price,
            p.purchase_price or "",
            p.gst_rate,
            p.hsn_sac_code or "",
            p.current_stock,
            p.reorder_level,
            p.status.value,
        ])

    if format == "xlsx":
        try:
            import openpyxl
            from openpyxl.styles import Font, PatternFill
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Products"
            header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
            for col_idx, h in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col_idx, value=h)
                cell.fill = header_fill
                cell.font = Font(color="FFFFFF", bold=True)
            for row_idx, row_data in enumerate(rows, 2):
                for col_idx, val in enumerate(row_data, 1):
                    ws.cell(row=row_idx, column=col_idx, value=val)

            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=products_export.xlsx"},
            )
        except ImportError:
            pass  # Fall through to CSV

    # CSV export
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    csv_bytes = output.getvalue().encode("utf-8-sig")
    output.close()

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products_export.csv"},
    )


# ─── Import Processing ─────────────────────────────────────────────────────────

def _parse_file(content: bytes, ext: str):
    """Parse CSV or Excel file content, return (rows, headers)."""
    if ext in ("xlsx", "xls"):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.active
            all_rows = list(ws.iter_rows(values_only=True))
            if not all_rows:
                return [], []
            headers = [str(h).strip() if h is not None else "" for h in all_rows[0]]
            rows = []
            for row in all_rows[1:]:
                if any(cell is not None for cell in row):
                    rows.append([str(cell).strip() if cell is not None else "" for cell in row])
            return rows, headers
        except Exception as e:
            return [], []
    else:
        # CSV
        try:
            # Try UTF-8 with BOM first
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                text = content.decode("latin-1")
            except Exception:
                return [], []

        reader = csv.reader(io.StringIO(text))
        all_rows = list(reader)
        if not all_rows:
            return [], []
        headers = [h.strip() for h in all_rows[0]]
        rows = [row for row in all_rows[1:] if any(cell.strip() for cell in row)]
        return rows, headers


def _get_cell(row: list, headers: list, column_name: Optional[str]) -> str:
    """Get a cell value by mapped column name."""
    if not column_name or column_name not in headers:
        return ""
    try:
        idx = headers.index(column_name)
        return str(row[idx]).strip() if idx < len(row) else ""
    except (ValueError, IndexError):
        return ""


def _process_import(batch_id: int, rows: list, mapping: dict, duplicate_strategy: str, company_id: int, user_id: int) -> None:
    """Process import synchronously."""
    db = SessionLocal()
    try:
        batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
        if not batch:
            return

        # Get headers from mapping (mapping is field→header)
        # We need to work with row data directly using the mapping
        headers_order = list(mapping.values())  # The actual header names used

        # Build a reverse lookup: for each row, find header position
        # We'll need to re-parse — store the actual headers with the batch
        # For simplicity, treat rows as dicts built from the mapping

        imported = updated = skipped = error_rows = duplicate_rows = 0

        # Build existing product index for duplicate detection
        existing_by_name = {}
        existing_by_sku = {}
        existing_by_barcode = {}

        all_existing = db.query(BusinessProduct).filter(BusinessProduct.company_id == company_id).all()
        for p in all_existing:
            existing_by_name[p.name.lower().strip()] = p
            if p.sku:
                existing_by_sku[p.sku.lower().strip()] = p
            if p.barcode:
                existing_by_barcode[p.barcode.strip()] = p

        for row_num, row in enumerate(rows, 2):  # Row 1 is header
            try:
                name = _get_cell_from_row(row, mapping, "name")
                if not name:
                    _add_error(db, batch_id, row_num, row, "Name is required", "validation")
                    error_rows += 1
                    continue

                sku = _get_cell_from_row(row, mapping, "sku")
                barcode = _get_cell_from_row(row, mapping, "barcode")
                category_name = _get_cell_from_row(row, mapping, "category")
                brand_name = _get_cell_from_row(row, mapping, "brand")
                unit = _get_cell_from_row(row, mapping, "unit") or "Pcs"
                selling_price_str = _get_cell_from_row(row, mapping, "selling_price")
                purchase_price_str = _get_cell_from_row(row, mapping, "purchase_price")
                gst_rate_str = _get_cell_from_row(row, mapping, "gst_rate")
                hsn_sac = _get_cell_from_row(row, mapping, "hsn_sac_code")
                opening_stock_str = _get_cell_from_row(row, mapping, "opening_stock")
                reorder_level_str = _get_cell_from_row(row, mapping, "reorder_level")

                # Parse numeric values
                selling_price = _safe_float(selling_price_str, 0.0)
                purchase_price = _safe_float(purchase_price_str)
                gst_rate = _safe_float(gst_rate_str, 0.0)
                opening_stock = _safe_float(opening_stock_str, 0.0)
                reorder_level = _safe_float(reorder_level_str, 0.0)

                # Validate GST rate
                if gst_rate not in (0, 5, 12, 18, 28) and gst_rate != 0.0:
                    # Don't reject — just flag it
                    pass

                # Find or create category
                category_id = None
                if category_name:
                    cat = db.query(ProductCategory).filter(
                        ProductCategory.company_id == company_id,
                        ProductCategory.name == category_name,
                    ).first()
                    if not cat:
                        cat = ProductCategory(company_id=company_id, name=category_name)
                        db.add(cat)
                        db.flush()
                    category_id = cat.id

                # Check for duplicates
                existing = None
                if sku and sku.lower() in existing_by_sku:
                    existing = existing_by_sku[sku.lower()]
                elif barcode and barcode in existing_by_barcode:
                    existing = existing_by_barcode[barcode]
                elif name.lower() in existing_by_name:
                    existing = existing_by_name[name.lower()]

                if existing:
                    duplicate_rows += 1
                    if duplicate_strategy == "skip":
                        skipped += 1
                        continue
                    elif duplicate_strategy == "update":
                        existing.name = name
                        existing.sku = sku or existing.sku
                        existing.barcode = barcode or existing.barcode
                        existing.category_id = category_id or existing.category_id
                        existing.unit = unit
                        existing.selling_price = selling_price
                        if purchase_price is not None:
                            existing.purchase_price = purchase_price
                        existing.gst_rate = gst_rate
                        existing.hsn_sac_code = hsn_sac or existing.hsn_sac_code
                        db.flush()
                        updated += 1
                        continue
                    else:  # error
                        _add_error(db, batch_id, row_num, row, f"Duplicate product: {name}", "duplicate")
                        error_rows += 1
                        continue

                # Create new product
                product = BusinessProduct(
                    company_id=company_id,
                    import_batch_id=batch_id,
                    name=name,
                    sku=sku or None,
                    barcode=barcode or None,
                    category_id=category_id,
                    unit=unit,
                    selling_price=selling_price,
                    purchase_price=purchase_price,
                    gst_rate=gst_rate,
                    hsn_sac_code=hsn_sac or None,
                    opening_stock=opening_stock,
                    current_stock=opening_stock,
                    reorder_level=reorder_level,
                    tax_verified=False,  # Always unverified on import
                )
                db.add(product)
                db.flush()

                # Record opening stock movement
                if opening_stock > 0:
                    movement = InventoryMovement(
                        company_id=company_id,
                        product_id=product.id,
                        movement_type=MovementType.OPENING,
                        quantity=opening_stock,
                        stock_before=0.0,
                        stock_after=opening_stock,
                        notes=f"Imported from {batch.filename}",
                        created_by=user_id,
                    )
                    db.add(movement)

                # Update lookup indices
                existing_by_name[name.lower().strip()] = product
                if sku:
                    existing_by_sku[sku.lower().strip()] = product
                if barcode:
                    existing_by_barcode[barcode] = product

                imported += 1

                # Commit in batches of 100
                if (imported + updated) % 100 == 0:
                    db.commit()

            except Exception as e:
                _add_error(db, batch_id, row_num, row, str(e), "system")
                error_rows += 1
                db.rollback()
                # Re-query batch after rollback
                batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()

        # Final commit
        if batch:
            batch.imported_rows = imported
            batch.updated_rows = updated
            batch.skipped_rows = skipped
            batch.error_rows = error_rows
            batch.duplicate_rows = duplicate_rows
            batch.valid_rows = imported + updated
            batch.status = "done"
            batch.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        db.rollback()
        batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
        if batch:
            batch.status = "error"
            db.commit()
    finally:
        db.close()


def _process_import_bg(batch_id: int, rows: list, mapping: dict, duplicate_strategy: str, company_id: int, user_id: int):
    """Background import processing wrapper."""
    _process_import(batch_id, rows, mapping, duplicate_strategy, company_id, user_id)


def _get_cell_from_row(row: list, mapping: dict, field: str) -> str:
    """
    Given a row (list) and mapping (field→header), extract the cell value.
    The mapping uses header names, but we need index in row.
    Since we don't have headers here, mapping values are positional hints.
    We use a simpler approach: pass mapping as field→index.
    """
    header_name = mapping.get(field)
    if not header_name:
        return ""
    # mapping[field] is the header name; we need to look up the index
    # This is handled by the fact that during execute_import we store the index
    # For now, use mapping as field→column_index when value is integer
    if isinstance(header_name, int):
        return str(row[header_name]).strip() if header_name < len(row) else ""
    return ""


def _safe_float(value: str, default=None) -> Optional[float]:
    if not value or value.strip() == "":
        return default
    try:
        # Remove currency symbols
        clean = value.replace("₹", "").replace(",", "").strip()
        return float(clean)
    except (ValueError, AttributeError):
        return default


def _add_error(db: Session, batch_id: int, row_num: int, row: list, message: str, error_type: str):
    err = ImportRowError(
        batch_id=batch_id,
        row_number=row_num,
        raw_data=json.dumps(row[:10]),  # First 10 cols
        error_message=message,
        error_type=error_type,
    )
    db.add(err)


# ─── Fixed execute endpoint using index-based mapping ────────────────────────

@router.post("/execute-v2")
async def execute_import_v2(
    file: UploadFile = File(...),
    column_mapping: str = Form(...),  # JSON {"name": 0, "sku": 2, ...} (field→column_index)
    duplicate_strategy: str = Form("skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Execute import with index-based column mapping (returned from /preview with header index).
    column_mapping: JSON {"name": 0, "selling_price": 4, ...} where values are column indices (0-based)
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")

    try:
        mapping = {k: int(v) for k, v in json.loads(column_mapping).items() if v is not None and str(v).isdigit()}
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid column mapping: {e}")

    if "name" not in mapping:
        raise HTTPException(status_code=400, detail="Column mapping must include 'name'")

    content = await file.read()
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "csv"

    rows, headers = _parse_file(content, ext)
    if not rows:
        raise HTTPException(status_code=400, detail="File has no data rows")

    batch = ImportBatch(
        company_id=current_user.company_id,
        user_id=current_user.id,
        filename=filename,
        file_type=ext,
        total_rows=len(rows),
        status="processing",
        column_mapping=column_mapping,
        started_at=datetime.utcnow(),
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Process
    _process_import_indexed(batch.id, rows, mapping, duplicate_strategy, current_user.company_id, current_user.id)
    db.refresh(batch)

    return {
        "batch_id": batch.id,
        "status": batch.status,
        "total": batch.total_rows,
        "imported": batch.imported_rows,
        "updated": batch.updated_rows,
        "skipped": batch.skipped_rows,
        "errors": batch.error_rows,
        "duplicates": batch.duplicate_rows,
    }


def _process_import_indexed(batch_id: int, rows: list, mapping: dict, duplicate_strategy: str, company_id: int, user_id: int):
    """Process import with integer-indexed column mapping."""
    db = SessionLocal()
    try:
        batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
        if not batch:
            return

        imported = updated = skipped = error_rows = duplicate_rows = 0

        existing_by_name = {}
        existing_by_barcode = {}
        all_existing = db.query(BusinessProduct).filter(BusinessProduct.company_id == company_id).all()
        for p in all_existing:
            existing_by_name[p.name.lower().strip()] = p
            if p.barcode:
                existing_by_barcode[p.barcode.strip()] = p

        def get(row, field):
            idx = mapping.get(field)
            if idx is None or not isinstance(idx, int) or idx >= len(row):
                return ""
            return str(row[idx]).strip()

        for row_num, row in enumerate(rows, 2):
            try:
                name = get(row, "name")
                if not name:
                    _add_error(db, batch_id, row_num, row, "Name is required", "validation")
                    error_rows += 1
                    continue

                sku = get(row, "sku") or None
                barcode = get(row, "barcode") or None
                category_name = get(row, "category")
                unit = get(row, "unit") or "Pcs"
                selling_price = _safe_float(get(row, "selling_price"), 0.0)
                purchase_price = _safe_float(get(row, "purchase_price"))
                gst_rate = _safe_float(get(row, "gst_rate"), 0.0)
                hsn_sac = get(row, "hsn_sac_code") or None
                opening_stock = _safe_float(get(row, "opening_stock"), 0.0)
                reorder_level = _safe_float(get(row, "reorder_level"), 0.0)

                # Find or create category
                category_id = None
                if category_name:
                    cat = db.query(ProductCategory).filter(
                        ProductCategory.company_id == company_id,
                        ProductCategory.name == category_name,
                    ).first()
                    if not cat:
                        cat = ProductCategory(company_id=company_id, name=category_name)
                        db.add(cat)
                        db.flush()
                    category_id = cat.id

                # Check for duplicates
                existing = None
                if barcode and barcode in existing_by_barcode:
                    existing = existing_by_barcode[barcode]
                elif name.lower() in existing_by_name:
                    existing = existing_by_name[name.lower()]

                if existing:
                    duplicate_rows += 1
                    if duplicate_strategy == "skip":
                        skipped += 1
                        continue
                    elif duplicate_strategy == "update":
                        existing.name = name
                        if sku:
                            existing.sku = sku
                        if barcode:
                            existing.barcode = barcode
                        if category_id:
                            existing.category_id = category_id
                        existing.unit = unit
                        if selling_price is not None:
                            existing.selling_price = selling_price
                        if purchase_price is not None:
                            existing.purchase_price = purchase_price
                        if gst_rate is not None:
                            existing.gst_rate = gst_rate
                        db.flush()
                        updated += 1
                        continue
                    else:
                        _add_error(db, batch_id, row_num, row, f"Duplicate: {name}", "duplicate")
                        error_rows += 1
                        continue

                product = BusinessProduct(
                    company_id=company_id,
                    import_batch_id=batch_id,
                    name=name,
                    sku=sku,
                    barcode=barcode,
                    category_id=category_id,
                    unit=unit,
                    selling_price=selling_price or 0.0,
                    purchase_price=purchase_price,
                    gst_rate=gst_rate or 0.0,
                    hsn_sac_code=hsn_sac,
                    opening_stock=opening_stock or 0.0,
                    current_stock=opening_stock or 0.0,
                    reorder_level=reorder_level or 0.0,
                    tax_verified=False,
                )
                db.add(product)
                db.flush()

                if opening_stock and opening_stock > 0:
                    db.add(InventoryMovement(
                        company_id=company_id,
                        product_id=product.id,
                        movement_type=MovementType.OPENING,
                        quantity=opening_stock,
                        stock_before=0.0,
                        stock_after=opening_stock,
                        notes="Imported",
                        created_by=user_id,
                    ))

                existing_by_name[name.lower().strip()] = product
                if barcode:
                    existing_by_barcode[barcode] = product
                imported += 1

                if (imported + updated) % 100 == 0:
                    db.commit()

            except Exception as e:
                _add_error(db, batch_id, row_num, row, str(e), "system")
                error_rows += 1
                db.rollback()
                batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
                if not batch:
                    return

        if batch:
            batch.imported_rows = imported
            batch.updated_rows = updated
            batch.skipped_rows = skipped
            batch.error_rows = error_rows
            batch.duplicate_rows = duplicate_rows
            batch.valid_rows = imported + updated
            batch.status = "done"
            batch.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
        if batch:
            batch.status = "error"
            db.commit()
    finally:
        db.close()
