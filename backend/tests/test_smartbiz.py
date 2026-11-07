import sys
import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from database import Base, engine, SessionLocal, init_db

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Initialize DB and seed catalogue before running tests."""
    init_db()


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_auth_and_setup_workflow():
    # Check setup status
    res = client.get("/api/v1/auth/setup-status")
    assert res.status_code == 200

    # Register admin if needs setup, otherwise login
    if res.json()["needs_setup"]:
        reg_res = client.post(
            "/api/v1/auth/register",
            json={
                "username": "admin",
                "password": "Password123!",
                "full_name": "Test Administrator",
                "email": "admin@example.com",
            },
        )
        assert reg_res.status_code == 200
        token = reg_res.json()["access_token"]
    else:
        login_res = client.post(
            "/api/v1/auth/token",
            data={"username": "admin", "password": "Password123!"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

    assert token is not None

    headers = {"Authorization": f"Bearer {token}"}

    # Verify /auth/me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "admin"


def test_business_and_catalogue_workflow():
    # Login as admin
    login_res = client.post(
        "/api/v1/auth/token",
        data={"username": "admin", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create company if not already created
    comp_res = client.get("/api/v1/companies/current", headers=headers)
    if not comp_res.json():
        create_res = client.post(
            "/api/v1/companies",
            headers=headers,
            json={
                "name": "SmartBiz Test Restaurant",
                "business_category": "hotel_restaurant",
                "phone": "+91 98765 43210",
                "gstin": "33AAAAA0000A1Z5",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "currency_code": "INR",
                "currency_symbol": "₹",
            },
        )
        assert create_res.status_code == 200

    # Verify categories for hotel_restaurant
    cats_res = client.get(
        "/api/v1/catalogue/categories",
        headers=headers,
        params={"business_category": "hotel_restaurant"},
    )
    assert cats_res.status_code == 200
    categories = cats_res.json()
    assert len(categories) > 0

    # Retrieve items
    items_res = client.get(
        "/api/v1/catalogue/items",
        headers=headers,
        params={"business_category": "hotel_restaurant", "page_size": 10},
    )
    assert items_res.status_code == 200
    items_data = items_res.json()
    assert items_data["total"] > 0
    item_ids = [item["id"] for item in items_data["items"][:5]]

    # Import catalogue items to inventory
    import_res = client.post(
        "/api/v1/products/import-from-catalogue",
        headers=headers,
        json={"catalogue_item_ids": item_ids, "default_selling_price": 75.0},
    )
    assert import_res.status_code == 200
    assert "imported" in import_res.json()


def test_product_crud_and_barcode():
    login_res = client.post(
        "/api/v1/auth/token",
        data={"username": "admin", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    barcode = "8901234567890"

    # Create or verify product with barcode
    prod_res = client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Masala Dosa Special",
            "barcode": barcode,
            "unit": "Plate",
            "selling_price": 95.0,
            "purchase_price": 40.0,
            "gst_rate": 5.0,
            "opening_stock": 50.0,
            "reorder_level": 10.0,
            "track_inventory": True,
        },
    )
    # 200 if created, 409 if already exists
    assert prod_res.status_code in (200, 409)

    # Look up by barcode
    bc_res = client.get(f"/api/v1/products/barcode/{barcode}", headers=headers)
    assert bc_res.status_code == 200
    assert bc_res.json()["barcode"] == barcode


def test_billing_pos_invoice_creation():
    login_res = client.post(
        "/api/v1/auth/token",
        data={"username": "admin", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get a product to bill
    prods_res = client.get("/api/v1/products", headers=headers, params={"page_size": 1})
    product = prods_res.json()["items"][0]

    # Create an invoice
    inv_res = client.post(
        "/api/v1/billing",
        headers=headers,
        json={
            "customer_name": "Test Customer",
            "payment_method": "cash",
            "items": [
                {
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "unit": product["unit"],
                    "quantity": 2.0,
                    "unit_price": product["selling_price"],
                    "gst_rate": product["gst_rate"],
                }
            ],
        },
    )
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    assert "invoice_number" in inv_data
    assert inv_data["grand_total"] > 0


def test_bulk_template_download():
    # Test CSV template
    csv_res = client.get("/api/v1/import-export/template/general")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]

    # Test Restaurant XLSX template
    xlsx_res = client.get("/api/v1/import-export/template/hotel_restaurant/xlsx")
    assert xlsx_res.status_code == 200
    assert "spreadsheetml" in xlsx_res.headers["content-type"]


def test_ai_assistant():
    login_res = client.post(
        "/api/v1/auth/token",
        data={"username": "admin", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test business query
    chat_res = client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={"message": "What are today's sales?"},
    )
    assert chat_res.status_code == 200
    assert "response" in chat_res.json()


def test_create_custom_user_and_login():
    """Verify creating a custom username & password, then logging in."""
    import uuid
    test_user = f"user_{uuid.uuid4().hex[:6]}"
    test_pass = "SecurePass123"

    reg = client.post(
        "/api/v1/auth/register",
        json={
            "username": test_user,
            "password": test_pass,
            "full_name": "Amuthan Ilavan",
            "email": f"{test_user}@test.local",
        },
    )
    assert reg.status_code == 200
    assert reg.json()["username"] == test_user
    assert "access_token" in reg.json()

    # Log in with the newly created username and password
    login_res = client.post(
        "/api/v1/auth/token",
        data={"username": test_user, "password": test_pass},
    )
    assert login_res.status_code == 200
    assert login_res.json()["username"] == test_user
    assert "access_token" in login_res.json()
