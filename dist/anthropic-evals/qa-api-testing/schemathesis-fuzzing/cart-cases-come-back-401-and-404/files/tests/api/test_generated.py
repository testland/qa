import json
import os

import schemathesis
from hypothesis import settings

import conftest

schema = schemathesis.openapi.from_url(os.environ["SCHEMA_URL"])

COUNTS = {"generated": 0, "validated": 0}


@schema.parametrize()
@settings(max_examples=3)  # each example writes a real cart row - keep it low
def test_api(case):
    COUNTS["generated"] += 1

    if "{cart_id}" in case.path and conftest.CART_ID is None:
        return
    if "{order_id}" in case.path and conftest.ORDER_ID is None:
        return

    params = dict(case.path_parameters or {})
    if "cart_id" in params:
        params["cart_id"] = conftest.CART_ID
    if "order_id" in params:
        params["order_id"] = conftest.ORDER_ID
    case.path_parameters = params

    response = case.call(
        headers={"Authorization": f"Bearer {os.environ.get('ORILLO_TOKEN', '')}"}
    )

    if case.method.upper() == "POST" and case.path == "/v1/carts" and response.status_code == 201:
        conftest.CART_ID = response.json()["id"]
    if case.method.upper() == "POST" and case.path == "/v1/orders" and response.status_code == 201:
        conftest.ORDER_ID = response.json()["id"]

    COUNTS["validated"] += 1
    case.validate_response(response)


def test_checkout_operations_are_published():
    paths = schema.raw_schema["paths"]
    for p in ["/v1/sessions", "/v1/carts", "/v1/carts/{cart_id}/items", "/v1/orders"]:
        assert p in paths


def teardown_module(module):
    os.makedirs("logs", exist_ok=True)
    with open("logs/counts.json", "w") as fh:
        json.dump(COUNTS, fh)
