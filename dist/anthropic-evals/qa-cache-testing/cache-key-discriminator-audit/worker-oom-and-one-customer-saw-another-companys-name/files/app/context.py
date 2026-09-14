"""Per-request context, built by the middleware and dropped at response time."""

from functools import cached_property

from . import db


class TenantContext:
    def __init__(self, tenant_id):
        self.tenant_id = tenant_id

    @cached_property
    def feature_flags(self):
        return db.fetch_flags(self.tenant_id)
