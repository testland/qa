import os

import schemathesis
from hypothesis import settings

schema = schemathesis.openapi.from_url(
    "https://staging.northbeam.health/swagger.json",
    base_url="https://staging.northbeam.health",
)


@schema.parametrize()
@schemathesis.hook("before_call")
def attach_token(context, case):
    case.headers["Authorization"] = f"Bearer {os.environ['TOKEN']}"


@settings(max_examples=300, deadline=None)
def test_generated(case):
    case.call_and_validate()
