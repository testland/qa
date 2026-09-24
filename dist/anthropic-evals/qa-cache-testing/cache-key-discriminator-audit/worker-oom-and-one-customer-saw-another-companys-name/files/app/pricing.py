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
