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
