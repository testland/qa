import requests, os

BASE = os.environ["TRACKER_BASE"]
HEADERS = {"Authorization": os.environ["TRACKER_AUTH"]}
STALE_DAYS = 7


def comment(key, text):
    r = requests.post(f"{BASE}/rest/api/3/issue/{key}/comment",
                      json={"body": text}, headers=HEADERS)
    return r.status_code


def sweep(stale_tickets):
    for t in stale_tickets:
        comment(t["key"], f"No response in {STALE_DAYS} days. Closing as unreproducible.")
        requests.post(f"{BASE}/rest/api/3/issue/{t['key']}/transitions",
                      json={"transition": {"id": "41"},
                            "fields": {"resolution": {"name": "Cannot Reproduce"}}},
                      headers=HEADERS)
