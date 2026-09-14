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
