import requests

BASE_URL = "http://localhost:3000"


def test_health_endpoint_is_up():
    r = requests.get(f"{BASE_URL}/healthz", timeout=5)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_version_endpoint_reports_a_build():
    r = requests.get(f"{BASE_URL}/version", timeout=5)
    assert r.status_code == 200
    assert r.json()["build"]


def test_catalog_api_returns_products():
    r = requests.get(f"{BASE_URL}/api/products", timeout=5)
    assert r.status_code == 200
    assert len(r.json()["items"]) == 24
