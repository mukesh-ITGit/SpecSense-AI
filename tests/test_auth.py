from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    response = client.post("/api/v1/auth/login", json={
        "email": "sarah.jenkins@specsense.ai",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "sarah.jenkins@specsense.ai"
    assert data["user"]["name"] == "Sarah Jenkins"

def test_login_invalid_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "sarah.jenkins@specsense.ai",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "email or password" in response.json()["detail"].lower()

def test_login_nonexistent_user():
    response = client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "password123"
    })
    assert response.status_code == 401

def test_get_current_user_profile():
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@specsense.ai",
        "password": "Admin123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 2. Get Profile with Bearer token
    me_res = client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["email"] == "admin@specsense.ai"
    assert data["role"] == "Chief Data Officer"

def test_get_current_user_unauthorized():
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401

def test_register_and_login():
    import uuid
    new_email = f"testuser_{uuid.uuid4().hex[:8]}@specsense.ai"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": new_email,
        "password": "newPassword123!",
        "name": "Test User",
        "role": "Data Analyst",
        "company": "SpecSense Demo"
    })
    assert reg_res.status_code in [200, 201]
    data = reg_res.json()
    assert data["user"]["email"] == new_email

    # Verify we can login now
    login_res = client.post("/api/v1/auth/login", json={
        "email": new_email,
        "password": "newPassword123!"
    })
    assert login_res.status_code == 200

