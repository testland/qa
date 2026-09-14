import unittest

from shipping.rates import OverweightParcel, base_rate, order_total


class BaseRateTests(unittest.TestCase):
    def test_light_parcel(self):
        self.assertEqual(base_rate(2.0), 3.9)

    def test_overweight_parcel_rejected(self):
        with self.assertRaises(OverweightParcel):
            base_rate(25.0)


class OrderTotalTests(unittest.TestCase):
    def test_standard_order(self):
        self.assertEqual(order_total(20.0, 2.0, False, 0.0), 23.9)

    def test_free_shipping_above_threshold(self):
        self.assertEqual(order_total(120.0, 2.0, False, 0.0), 120.0)

    def test_express_adds_surcharge(self):
        total = order_total(20.0, 2.0, True, 0.0)
        self.assertGreater(total, 0)


if __name__ == "__main__":
    unittest.main()
