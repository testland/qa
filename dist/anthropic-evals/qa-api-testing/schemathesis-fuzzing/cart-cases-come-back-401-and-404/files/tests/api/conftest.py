import os

import pytest
import requests

BASE = os.environ["STAGING_BASE"]

# handed from one generated case to the next - set in test_generated.py
CART_ID = None
ORDER_ID = None


@pytest.fixture(scope="session", autouse=True)
def login():
    r = requests.post(
        f"{BASE}/v1/sessions",
        json={"email": "qa@orillo.test", "password": os.environ["QA_PASSWORD"]},
    )
    r.raise_for_status()
    os.environ["ORILLO_TOKEN"] = r.json()["access_token"]
    return os.environ["ORILLO_TOKEN"]
