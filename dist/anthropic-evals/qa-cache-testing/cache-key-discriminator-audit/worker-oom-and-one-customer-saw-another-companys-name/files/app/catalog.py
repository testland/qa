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
