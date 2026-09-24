# Catalogue worker is OOM-killed every night and one customer saw another company's name

## Problem Description

Two things landed on me this week and I have been told they are the same bug.

The catalogue worker starts at about 400 MB and gets OOM-killed at 3 GB roughly
six hours in, every night since the 4.2.0 deploy on 2026-06-30. The object
counts and one referrer chain from the 05:40 sample are in `ops/`.

Separately, ticket 8812: a customer at Northwind Traders had "Acme Supply Co"
sitting at the top of their catalogue page for about twenty minutes on
2026-09-09, over a product list they did not recognise. It cleared on its own
and we have not reproduced it since.

Jonas looked at both on Friday before he went on leave. His note is the only
explanation anyone has offered and I am minded to act on it in Friday's window:

> `lru_cache` on a method does not put `self` into the key, so every instance
> of the class shares one set of entries. That is both symptoms. One cache for
> every tenant explains the wrong company name, and one cache that never
> shrinks explains the memory.

He is back on the 22nd and I am not waiting for him.

Four things in `app/` memoize a result. I need to know which of them are
actually defective, what each one is actually doing, and what the fix is for
each - including the ones where the answer is to change nothing. One of the four
is on a billing path and finance will not sign off a change there on a theory.

## Output Specification

1. Write `docs/cache-audit-8812.md`. One entry per memoized callable in `app/`,
   each giving a verdict (defect or not), what the mechanism actually is for
   that callable, how bad it is, and either the fix or the reason for leaving it
   alone. State whether you are acting on the note quoted above as written.
2. Apply the fixes in `app/` for the ones that are defects. Leave the others
   exactly as they are. If you touch the pricing path, the amounts it returns
   must not change.
3. Add `tests/test_tenant_isolation.py`, covering every callable you changed,
   with at least one test that fails against the code as it stands and passes
   after your change.
4. `python -m unittest discover -s tests -t .` must pass. `tests/test_catalog.py`
   and `tests/test_pricing.py` are shipped and passing; do not edit or delete
   anything in them.

## Input Files

Extract the following files before beginning.

=============== FILE: app/__init__.py ===============
"""Catalogue worker."""

=============== FILE: app/db.py ===============
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

=============== FILE: app/registry.py ===============
"""Shared connection registry: one pooled connection per region."""

_CONNECTIONS = {}


class RegionKeyed:
    """Base for objects the registry hands a pooled connection to."""

    def _registry_key(self):
        return (self.region, self.catalog_version)

    def __eq__(self, other):
        if not isinstance(other, RegionKeyed):
            return NotImplemented
        return self._registry_key() == other._registry_key()

    def __hash__(self):
        return hash(self._registry_key())


def connection_for(obj):
    if obj not in _CONNECTIONS:
        _CONNECTIONS[obj] = "conn-{}-{}".format(obj.region, obj.catalog_version)
    return _CONNECTIONS[obj]

=============== FILE: app/catalog.py ===============
"""Catalogue reads for the rendered category page."""

from functools import lru_cache

from . import db
from .registry import RegionKeyed


class CatalogRepo(RegionKeyed):
    def __init__(self, region, catalog_version, tenant_id):
        self.region = region
        self.catalog_version = catalog_version
        self.tenant_id = tenant_id

    @lru_cache(maxsize=2048)
    def load_category(self, slug):
        row = db.fetch_category(self.tenant_id, slug)
        return {"org": row["org_name"], "title": row["title"], "items": row["items"]}


def repo_for(session):
    return CatalogRepo(
        region=session["region"],
        catalog_version=db.CATALOG_VERSION,
        tenant_id=session["tenant_id"],
    )


def category_page(session, slug):
    return repo_for(session).load_category(slug)

=============== FILE: app/pricing.py ===============
"""Seat pricing. Billing path - changes here go through finance review."""

from functools import lru_cache

from . import db


class PricingEngine:
    def __init__(self, tenant_id, currency, rate_table):
        self.tenant_id = tenant_id
        self.currency = currency
        self.rate_table = rate_table

    @lru_cache(maxsize=8192)
    def quote(self, sku, seats):
        unit = self.rate_table[sku]
        return {"currency": self.currency, "cents": unit * seats}


def quote_for(session, sku, seats):
    engine = PricingEngine(
        session["tenant_id"],
        session["currency"],
        db.rate_table(session["tenant_id"]),
    )
    return engine.quote(sku, seats)

=============== FILE: app/formatting.py ===============
"""Display helpers."""

from functools import lru_cache

_SYMBOLS = {"USD": "$", "GBP": "GBP ", "EUR": "EUR ", "JPY": "JPY "}


@lru_cache(maxsize=None)
def currency_symbol(code):
    return _SYMBOLS[code]

=============== FILE: app/context.py ===============
"""Per-request context, built by the middleware and dropped at response time."""

from functools import cached_property

from . import db


class TenantContext:
    def __init__(self, tenant_id):
        self.tenant_id = tenant_id

    @cached_property
    def feature_flags(self):
        return db.fetch_flags(self.tenant_id)

=============== FILE: tests/__init__.py ===============
"""Test package."""

=============== FILE: tests/test_catalog.py ===============
import unittest

from app import db
from app.catalog import category_page


class CategoryPageTest(unittest.TestCase):
    def test_returns_the_tenants_own_org_name(self):
        page = category_page({"tenant_id": "acme", "region": "eu"}, "footwear")
        self.assertEqual(page["org"], "Acme Supply Co")
        self.assertEqual(page["items"], ["a-100", "a-101", "a-102"])

    def test_a_repeated_page_does_not_hit_the_store_twice(self):
        session = {"tenant_id": "acme", "region": "eu"}
        before = db.CALLS["fetch_category"]
        category_page(session, "outdoor")
        category_page(session, "outdoor")
        self.assertEqual(db.CALLS["fetch_category"] - before, 1)


if __name__ == "__main__":
    unittest.main()

=============== FILE: tests/test_pricing.py ===============
import unittest

from app.pricing import quote_for


class QuoteTest(unittest.TestCase):
    def test_quote_multiplies_the_unit_rate_by_seats(self):
        session = {"tenant_id": "acme", "currency": "USD"}
        self.assertEqual(quote_for(session, "team", 5), {"currency": "USD", "cents": 6000})

    def test_quote_is_returned_in_the_sessions_currency(self):
        session = {"tenant_id": "acme", "currency": "GBP"}
        self.assertEqual(quote_for(session, "team", 5), {"currency": "GBP", "cents": 6000})


if __name__ == "__main__":
    unittest.main()

=============== FILE: docs/CHANGELOG.md ===============
# Changelog

## 4.2.0 - 2026-06-30

- `CatalogRepo` now goes through the shared connection registry, so it has to be
  hashable and comparable. Two requests for the same region reuse one pooled
  connection instead of opening one each.
- `PricingEngine.quote` memoised. Seat quotes were being recomputed on every
  keystroke in the plan picker; `maxsize` set to 8192 after a load test.
- Catalogue reads memoised at `maxsize=2048`.

## 4.1.3 - 2026-05-18

- Feature flags moved off the per-request fetch onto the request context.

## 4.1.0 - 2026-04-02

- Worker split out of the web process.

=============== FILE: ops/memory-2026-09-10.md ===============
# Catalogue worker - memory, night of 2026-09-09

RSS at start (23:04): 412 MB
RSS at 02:00: 1.41 GB
RSS at 05:40: 2.71 GB
OOM-killed 05:58, restarted by supervisor. Same shape every night since
2026-06-30. Request volume is flat across the window.

## gc object counts, sampled at 05:40

    dict                             4,812,006
    list                             1,004,551
    tuple                              998,220
    app.pricing.PricingEngine            8,192
    app.context.TenantContext               11
    app.catalog.CatalogRepo                  6

## Referrer chain for a PricingEngine allocated 23:05, still live at 05:40

    PricingEngine
      <- tuple
        <- dict
          <- functools._lru_cache_wrapper
            <- function PricingEngine.quote
              <- type PricingEngine

=============== FILE: ops/ticket-8812.md ===============
# 8812 - wrong company name on the catalogue page

**Reported:** 2026-09-09 14:22 by Northwind Traders (tenant `northwind`)
**Severity:** raised to P1 by the account team, currently unassigned

Customer screenshot shows the catalogue page header reading "Acme Supply Co"
above three product codes (a-100, a-101, a-102) that are not Northwind's.
Customer noticed because Acme Supply Co is a competitor of theirs.

Timeline from the access log:

    14:02:11  tenant=acme        region=eu  GET /catalog/footwear  200
    14:02:44  tenant=northwind   region=eu  GET /catalog/footwear  200
    14:21:58  tenant=northwind   region=eu  GET /catalog/footwear  200
    14:23:40  worker restart (deploy 4.2.6)
    14:24:02  tenant=northwind   region=eu  GET /catalog/footwear  200

Customer confirms the header was correct again after 14:24. Both tenants are
served out of the `eu` region. No error was logged on any of these requests.

Support has asked twice whether any other tenant has been affected. We do not
currently have an answer.
