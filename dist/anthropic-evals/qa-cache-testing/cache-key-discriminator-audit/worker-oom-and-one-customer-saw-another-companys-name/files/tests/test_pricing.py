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
