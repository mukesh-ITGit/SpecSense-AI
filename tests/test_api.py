from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)

def get_base_product():
    return {
        "product_id": "PROD-001",
        "part_number": "DCB518ASTS06G",
        "brand": "DIABLO",
        "manufacturer": "diablo",
        "category": "Abrasives",
        "attributes": {
            "product_type": "Sanding Belt",
            "width": "1/2\"",
            "length": "18\"",
            "pack_quantity": 6
        },
        "raw_sources": []
    }

def test_api_enrich_validate():
    response = client.post(
        "/api/v1/products/enrich-validate",
        json=get_base_product()
    )
    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == "PROD-001"
    assert data["trust_score"] >= 90
    assert data["validation"]["overall_status"] == "valid"

def test_api_batch():
    valid_product = get_base_product()
    
    invalid_product = get_base_product()
    invalid_product["product_id"] = "PROD-002"
    invalid_product["brand"] = "" # Missing required field
    
    conflicting_product = get_base_product()
    conflicting_product["product_id"] = "PROD-003"
    conflicting_product["raw_sources"] = [
        {"source": "manufacturer", "field": "material", "value": "A"},
        {"source": "distributor", "field": "material", "value": "B"}
    ]
    
    response = client.post(
        "/api/v1/products/enrich-validate/batch",
        json=[valid_product, invalid_product, conflicting_product]
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # Valid product
    assert data[0]["validation"]["overall_status"] == "valid"
    assert data[0]["needs_review"] is False
    
    # Invalid product
    assert data[1]["validation"]["overall_status"] == "invalid"
    assert data[1]["needs_review"] is True
    
    # Conflicting product
    assert len(data[2]["conflicts"]) == 1
    assert data[2]["needs_review"] is True
