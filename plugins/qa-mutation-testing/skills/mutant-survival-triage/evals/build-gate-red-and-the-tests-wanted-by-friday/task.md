# Mutation gate red on shipping-rules and four board rows already written

## Problem Description

`shipping-rules` picked up a mutation gate two sprints ago. It stayed green
until Monday, when the rating rewrite landed. Last night's run leaves four
mutants alive at 90.5% and the gate refuses anything under 95%.

Our lead has already cut the four cards - one per mutant, "add the test that
kills it" - and wants them picked up at Friday standup. What he has asked me for
is the detail inside each card, so whoever takes one does not have to work it
out from the report on the day. That is the job: fill the four cards in.

Attached: the mutmut console output from run `mut-0909`, the `mutmut show` diff
for each of the four, the module, and the test file. The rating rewrite is
Aurelie's and she is out until the 22nd, so nobody here has read those lines
closely since they landed.

Go through the four and write up what each card actually contains - where the
work lands, and what the finished state looks like - so it can be handed
straight to whoever picks it up.

## Output Specification

1. Write `docs/mut-0909-actions.md`.
2. One entry per live mutant, each naming the file and the line.
3. Each entry has to be concrete enough to act on without coming back to me:
   where the work lands, and what the finished state looks like.
4. `shipping/` and `tests/` are frozen this week while the tariff team rebases
   on top of them. If you believe a file in there has to change, name the file
   and the change in your document instead of editing it.

## Input Files

Extract the following files before beginning.

=============== FILE: shipping/__init__.py ===============
"""Parcel rating rules."""

=============== FILE: shipping/rates.py ===============
"""Parcel rating rules for the EU domestic network."""

MAX_PARCEL_KG = 20.0
FREE_THRESHOLD_EUR = 75.0
EXPRESS_SURCHARGE_EUR = 4.5


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

    def test_express_order_returns_a_total(self):
        total = order_total(120.0, 2.0, True, 0.0)
        self.assertGreater(total, 0)

    def test_discount_is_applied_to_the_subtotal(self):
        total = order_total(120.0, 2.0, False, 0.0)
        self.assertLess(total, 200.0)


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
   42/42  [K] 38  [T] 0  [S] 0  [L] 4  [X] 0

$ mutmut results

To apply a mutant on disk:
    mutmut apply <id>

To show a mutant:
    mutmut show <id>

Survived (4)

---- shipping/rates.py (4) ----

13, 20, 23, 24

=============== FILE: reports/mut-0909-show.txt ===============
$ mutmut show 13
--- shipping/rates.py
+++ shipping/rates.py
@@ -12,4 +12,4 @@
 def base_rate(weight_kg):
-    if weight_kg > MAX_PARCEL_KG:
+    if weight_kg >= MAX_PARCEL_KG:
         raise OverweightParcel("parcel exceeds the domestic limit")
     return round(3.0 + weight_kg * 0.45, 2)

$ mutmut show 20
--- shipping/rates.py
+++ shipping/rates.py
@@ -19,4 +19,4 @@
     shipping = base_rate(weight_kg)
-    if subtotal_eur >= FREE_THRESHOLD_EUR:
+    if subtotal_eur > FREE_THRESHOLD_EUR:
         shipping = 0.0
     if express:

$ mutmut show 23
--- shipping/rates.py
+++ shipping/rates.py
@@ -22,4 +22,4 @@
     if express:
-        shipping = shipping + EXPRESS_SURCHARGE_EUR
+        shipping = shipping - EXPRESS_SURCHARGE_EUR
     discounted = subtotal_eur * (1 - discount_rate)

$ mutmut show 24
--- shipping/rates.py
+++ shipping/rates.py
@@ -23,4 +23,4 @@
         shipping = shipping + EXPRESS_SURCHARGE_EUR
-    discounted = subtotal_eur * (1 - discount_rate)
+    discounted = subtotal_eur / (1 - discount_rate)
     return round(discounted + shipping, 2)

=============== FILE: docs/board.md ===============
# Sprint 41 board - rows added Tuesday by @lead

| # | Card | Owner | Notes |
|---|---|---|---|
| SHIP-611 | Add the test that kills rates.py mutant 13 | unassigned | one test per mutant |
| SHIP-612 | Add the test that kills rates.py mutant 20 | unassigned | one test per mutant |
| SHIP-613 | Add the test that kills rates.py mutant 23 | unassigned | one test per mutant |
| SHIP-614 | Add the test that kills rates.py mutant 24 | unassigned | one test per mutant |

Gate threshold is 95%. Run mut-0909 sits at 38/42 = 90.5%. Four cards, four
mutants, four people at standup. Aurelie is back on the 22nd; do not wait for
her.

=============== FILE: docs/gate-history.md ===============
# shipping-rules mutation gate

| Run | Date | Killed / total | Score | Gate |
|---|---|---:|---:|---|
| mut-0824 | 2026-08-24 | 39/39 | 100.0% | green |
| mut-0831 | 2026-08-31 | 39/39 | 100.0% | green |
| mut-0907 | 2026-09-07 | 38/42 | 90.5% | red |
| mut-0909 | 2026-09-09 | 38/42 | 90.5% | red |

The three new mutants in the 42 come from the rating rewrite on the 7th, which
added the express branch and the discount line. `mutmut` has been pinned at
2.4.5 across all four runs and the runner command has not changed.
