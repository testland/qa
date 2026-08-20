import time
import requests

MAILBOX_API = "https://mailbox.internal.acme.test/api/messages"


def wait_for_code(address, timeout=180):
    """Poll the shared test mailbox until a one-time code shows up."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(MAILBOX_API, params={"to": address}, timeout=10)
        for message in r.json().get("messages", []):
            if message.get("code"):
                return message["code"]
        time.sleep(5)
    raise TimeoutError(f"no one-time code for {address} within {timeout}s")
