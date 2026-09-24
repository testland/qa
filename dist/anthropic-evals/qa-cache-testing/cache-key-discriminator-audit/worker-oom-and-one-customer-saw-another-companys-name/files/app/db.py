"""In-memory stand-in for the catalogue store the worker reads from."""

CATALOG_VERSION = 7

CALLS = {"fetch_category": 0, "fetch_flags": 0}

_CATEGORIES = {
    ("acme", "footwear"): {
        "org_name": "Acme Supply Co",
        "title": "Footwear",
        "items": ["a-100", "a-101", "a-102"],
    },
    ("acme", "outdoor"): {
        "org_name": "Acme Supply Co",
        "title": "Outdoor",
        "items": ["a-200"],
    },
    ("northwind", "footwear"): {
        "org_name": "Northwind Traders",
        "title": "Footwear",
        "items": ["n-300", "n-301"],
    },
    ("northwind", "outdoor"): {
        "org_name": "Northwind Traders",
        "title": "Outdoor",
        "items": ["n-400"],
    },
}

_RATE_TABLES = {
    "acme": {"team": 1200, "business": 2400},
    "northwind": {"team": 1500, "business": 2900},
}

_FLAGS = {
    "acme": {"new_checkout": True, "bulk_import": False},
    "northwind": {"new_checkout": False, "bulk_import": True},
}


def fetch_category(tenant_id, slug):
    CALLS["fetch_category"] += 1
    return dict(_CATEGORIES[(tenant_id, slug)])


def rate_table(tenant_id):
    # In production this is roughly 2 MB of SKU rows per tenant.
    return dict(_RATE_TABLES[tenant_id])


def fetch_flags(tenant_id):
    CALLS["fetch_flags"] += 1
    return dict(_FLAGS[tenant_id])
