# Mutation gate red on shipping-rules and four board rows already written

## Problem Description

`shipping-rules` picked up a mutation gate two sprints ago. It stayed green
until Monday, when the rating rewrite landed. Last night's run leaves four
mutants alive at 90.2% and the gate refuses anything under 95%.

Our lead has asked for "four tests, one per line, in by Friday standup" and has
already put four rows on the sprint board, one per mutant. That is what I want
sanity-checked before anyone picks a card up.

Attached: the mutmut console output from run `mut-0909`, the `mutmut show` diff
for each of the four, the module, and the whole test file - there are only five
tests in it, so nothing is hidden. The rating rewrite is Aurelie's and she is
out until the 22nd, so nobody here has read those lines closely.

Go through the four and tell me what each one actually needs and where the work
lands, with the input and the assertion spelled out, so whoever takes the card
does not have to derive it again. If the four rows on the board are not the
right four rows, say so plainly - I would rather rewrite the board today than
explain a still-red gate on Friday.

## Output Specification

1. Write `docs/mut-0909-actions.md`.
2. Give one entry per live mutant, each naming the file and line, the concrete
   input on which the original and the mutated version behave differently, and
   the exact assertion that catches the difference.
3. For each entry, say what the work actually is and which named test it lands
   in.
4. `shipping/` and `tests/` are frozen this week while the tariff team rebases
   on top of them. If you believe a file in there has to change, name the file
   and the change in your document instead of editing it.

## Input Files

Extract the following files before beginning.

=============== FILE: shipping/rates.py ===============
"""Parcel rating rules for the EU domestic network."""

# Tariff constants are owned by the carrier contract, not by us.
MAX_PARCEL_KG = 20.0  # pragma: no mutate
FREE_THRESHOLD_EUR = 75.0  # pragma: no mutate
EXPRESS_SURCHARGE_EUR = 4.5  # pragma: no mutate


class OverweightParcel(ValueError):
    pass


def base_rate(weight_kg):
    if weight_kg > MAX_PARCEL_KG:
        raise OverweightParcel("parcel exceeds the domestic limit")
    return round(3.0 + weight_kg * 0.45, 2)


def order_total(subtotal_eur, weight_kg, express, discount_rate):
    shipping = base_rate(weight_kg)
    if subtotal_eur >= FREE_THRESHOLD_EUR:
        shipping = 0.0
    if express:
        shipping = shipping + EXPRESS_SURCHARGE_EUR
    discounted = subtotal_eur * (1 - discount_rate)
    return round(discounted + shipping, 2)

=============== FILE: tests/__init__.py ===============
"""Test package for shipping-rules."""

=============== FILE: tests/test_rates.py ===============
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

=============== FILE: reports/mut-0909-console.txt ===============
$ mutmut run --paths-to-mutate shipping/ --runner "python -m unittest discover -s tests -t ."

- Mutation testing starting -

These are the steps:
1. A full test suite run will be made to make sure we
   can run the tests successfully and we know how long it takes
2. Mutants will be generated and checked

Results are stored in .mutmut-cache.
Print found mutants with `mutmut results`.

Legend for output:
[K] Killed mutants.   The goal is for everything to end up in this bucket.
[T] Timeout.          Test suite took 10 times as long as the baseline so were killed.
[S] Suspicious.       Tests took a long time, but not long enough to be fatal.
[L] Survived.         This means your tests need to be expanded.
[X] Skipped.          Skipped.

1. Running tests without mutations
   Done

2. Checking mutants
   41/41  [K] 37  [T] 0  [S] 0  [L] 4  [X] 0

$ mutmut results

To apply a mutant on disk:
    mutmut apply <id>

To show a mutant:
    mutmut show <id>

Survived (4)

---- shipping/rates.py (4) ----

12, 19, 24, 27

=============== FILE: reports/mut-0909-show.txt ===============
$ mutmut show 12
--- shipping/rates.py
+++ shipping/rates.py
@@ -12,5 +12,5 @@

 def base_rate(weight_kg):
-    if weight_kg > MAX_PARCEL_KG:
+    if weight_kg >= MAX_PARCEL_KG:
         raise OverweightParcel("parcel exceeds the domestic limit")
     return round(3.0 + weight_kg * 0.45, 2)

$ mutmut show 19
--- shipping/rates.py
+++ shipping/rates.py
@@ -19,5 +19,5 @@
 def order_total(subtotal_eur, weight_kg, express, discount_rate):
     shipping = base_rate(weight_kg)
-    if subtotal_eur >= FREE_THRESHOLD_EUR:
+    if subtotal_eur > FREE_THRESHOLD_EUR:
         shipping = 0.0
     if express:

$ mutmut show 24
--- shipping/rates.py
+++ shipping/rates.py
@@ -22,4 +22,4 @@
         shipping = 0.0
     if express:
-        shipping = shipping + EXPRESS_SURCHARGE_EUR
+        shipping = shipping - EXPRESS_SURCHARGE_EUR
     discounted = subtotal_eur * (1 - discount_rate)

$ mutmut show 27
--- shipping/rates.py
+++ shipping/rates.py
@@ -23,4 +23,4 @@
     if express:
         shipping = shipping + EXPRESS_SURCHARGE_EUR
-    discounted = subtotal_eur * (1 - discount_rate)
+    discounted = subtotal_eur / (1 - discount_rate)
     return round(discounted + shipping, 2)

=============== FILE: docs/board.md ===============
# Sprint 41 board - rows added Tuesday by @lead

| # | Card | Owner | Notes |
|---|---|---|---|
| SHIP-611 | Add test for rates.py mutant 12 | unassigned | one test per mutant |
| SHIP-612 | Add test for rates.py mutant 19 | unassigned | one test per mutant |
| SHIP-613 | Add test for rates.py mutant 24 | unassigned | one test per mutant |
| SHIP-614 | Add test for rates.py mutant 27 | unassigned | one test per mutant |

Gate threshold is 95%. Run mut-0909 sits at 37/41 = 90.2%. Aurelie is back on
the 22nd; do not wait for her.
