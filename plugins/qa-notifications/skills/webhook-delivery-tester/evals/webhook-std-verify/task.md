# Verify Standard Webhooks signatures in our receiver

## Problem Description

Make `receiver/app.py` verify Standard Webhooks signatures correctly (`docs/provider.md`) and add tests, including the secret rotation.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: receiver/app.py ===============
import hashlib
import hmac
import json
import os

from flask import Flask, abort, request

from receiver.handlers import handle

app = Flask(__name__)
SECRET = os.environ["WEBHOOK_SECRET"]   # e.g. whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw


@app.post("/webhooks")
def webhooks():
    body = json.dumps(request.get_json(), separators=(",", ":"))
    expected = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
    sig = request.headers.get("webhook-signature", "")
    if sig.split(",")[1] != expected:
        abort(401)
    handle(request.get_json())
    return "", 204

=============== FILE: docs/provider.md ===============
# Provider notes

- The provider follows the Standard Webhooks spec: headers `webhook-id`, `webhook-timestamp`,
  `webhook-signature`.
- They will rotate our signing secret next week. For 24 hours both the old and the new secret
  will sign every delivery.
- Every delivery currently fails with 401.
