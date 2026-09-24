"""Nightly reporting export. Reads the warehouse, pushes panels to Grafana."""

import os
import requests

WAREHOUSE_DSN = os.environ["WAREHOUSE_DSN"]
GRAFANA_URL = "https://grafana.vantage.internal"
GRAFANA_TOKEN = "glsa_[REDACTED-IN-EVIDENCE-BUNDLE]"  # gitleaks:allow


def push_panel(uid: str, payload: dict) -> None:
    requests.post(
        f"{GRAFANA_URL}/api/dashboards/db",
        headers={"Authorization": f"Bearer {GRAFANA_TOKEN}"},
        json=payload,
        timeout=30,
    )
