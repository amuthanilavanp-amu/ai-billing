"""Company management router"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.company_models import Company, BusinessCategory
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


class CompanyCreate(BaseModel):
    name: str
    business_category: str = "other"
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    currency_code: str = "INR"
    currency_symbol: str = "₹"
    invoice_prefix: str = "INV"
    state_code: Optional[str] = None
    footer_note: Optional[str] = None
    terms_conditions: Optional[str] = None


class CompanyUpdate(CompanyCreate):
    pass


@router.post("")
def create_company(data: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        biz_cat = BusinessCategory(data.business_category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid business category: {data.business_category}")

    company = Company(**data.model_dump(exclude_none=False))
    company.business_category = biz_cat
    db.add(company)
    db.flush()

    # Associate user with company
    current_user.company_id = company.id
    db.commit()
    db.refresh(company)
    return {"id": company.id, "name": company.name, "business_category": company.business_category.value}


@router.get("/current")
def get_current_company(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        return None
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        return None
    return {
        "id": company.id,
        "name": company.name,
        "business_category": company.business_category.value,
        "gstin": company.gstin,
        "phone": company.phone,
        "email": company.email,
        "address_line1": company.address_line1,
        "city": company.city,
        "state": company.state,
        "pincode": company.pincode,
        "currency_code": company.currency_code,
        "currency_symbol": company.currency_symbol,
        "invoice_prefix": company.invoice_prefix,
        "invoice_next_number": company.invoice_next_number,
        "is_onboarding_complete": company.is_onboarding_complete,
        "onboarding_step": company.onboarding_step,
        "footer_note": company.footer_note,
        "terms_conditions": company.terms_conditions,
    }


@router.put("/current")
def update_company(data: CompanyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="No company associated")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    for field, value in data.model_dump(exclude_none=True).items():
        if field == "business_category":
            try:
                setattr(company, field, BusinessCategory(value))
            except ValueError:
                pass
        else:
            setattr(company, field, value)

    db.commit()
    return {"success": True}


@router.post("/complete-onboarding")
def complete_onboarding(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="No company")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if company:
        company.is_onboarding_complete = True
        db.commit()
    return {"success": True}


@router.get("/categories")
def list_business_categories():
    """Return all supported business categories."""
    categories = [
        {"value": cat.value, "label": cat.value.replace("_", " ").title()}
        for cat in BusinessCategory
    ]
    # Add friendly labels
    labels = {
        "hotel_restaurant": "Hotel & Restaurant",
        "cafe_coffee": "Cafe & Coffee Shop",
        "bakery_sweets": "Bakery & Sweets Shop",
        "supermarket": "Supermarket",
        "grocery_provision": "Grocery & Provision Store",
        "wholesale": "Wholesale & Distribution",
        "retail": "Retail Shop",
        "pharmacy": "Pharmacy",
        "hospital_clinic": "Hospital & Clinic",
        "medical_supplies": "Medical Supplies",
        "clothing": "Clothing & Garments",
        "footwear": "Footwear",
        "electronics": "Electronics & Computers",
        "mobile_accessories": "Mobile Accessories",
        "hardware": "Hardware & Building Materials",
        "cosmetics": "Cosmetics & Personal Care",
        "salon_beauty": "Salon & Beauty Parlour",
        "automobile_workshop": "Automobile Workshop",
        "spare_parts": "Spare Parts Shop",
        "manufacturing": "Manufacturing",
        "furniture": "Furniture Shop",
        "stationery": "Stationery & Book Shop",
        "agriculture": "Agriculture & Fertilizer Shop",
        "pet_supplies": "Pet Supplies",
        "sports_fitness": "Sports & Fitness Shop",
        "ecommerce": "Ecommerce",
        "education": "Education & Training",
        "professional_services": "Professional Services",
        "repair_maintenance": "Repair & Maintenance",
        "other": "Other / Custom Business",
    }
    return [{"value": cat.value, "label": labels.get(cat.value, cat.value)} for cat in BusinessCategory]
