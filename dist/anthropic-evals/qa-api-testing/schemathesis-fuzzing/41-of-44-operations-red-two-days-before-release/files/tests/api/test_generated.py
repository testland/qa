import os

import schemathesis

schema = schemathesis.openapi.from_url(
    "https://staging.halcyon.dev/openapi.json",
    base_url="https://staging.halcyon.dev",
)


@schema.parametrize()
@schemathesis.hook("before_call")
def attach_token(context, case):
    case.headers["Authorization"] = f"Bearer {os.environ['TOKEN']}"


def test_generated(case):
    case.call_and_validate()
