from fastapi.testclient import TestClient

from app.main import app


def test_health_is_ok():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_items_is_empty_by_default():
    with TestClient(app) as client:
        response = client.get("/items")
    assert response.status_code == 200
    assert response.json() == {}
