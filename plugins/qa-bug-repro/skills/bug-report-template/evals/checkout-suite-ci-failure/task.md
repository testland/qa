# Nightly checkout suite went red and nobody has written it up

## Problem Description

The nightly run of the checkout suite failed and the thread about it has been
going since 07:00 without anyone filing anything. One engineer described the
failure from memory in chat; the run's own result file is attached to the CI
job and says something different from what he typed.

The team's rule is that a red nightly gets written up before standup so the
owner can pick it up without opening the CI console. Nobody has done it, and
the thread is now three people deep in speculation about a promo-code change
from last sprint.

Whoever picks this up has to be able to re-run the exact failing case. The chat
thread refers to "this morning's build on main", which is not something anyone
can check out in two weeks' time.

## Output Specification

1. Write `reports/checkout-suite-nightly.md` for the owner who picks this up at
   standup.
2. The document must let them re-run the failing case themselves, and must be
   accurate about what the run actually reported.
3. Anything that would be needed for a re-run but is not in the attached files
   must be visible as such rather than approximated.

Out of scope: fixing the test, running anything, or investigating the promo-code
theory.

## Input Files

Extract the following files before beginning.

=============== FILE: artifacts/junit-checkout.xml ===============
<?xml version="1.0" encoding="utf-8"?>
<testsuites tests="41" failures="1" errors="0" time="212.884">
  <testsuite name="checkout" tests="41" failures="1" errors="0" skipped="0"
             timestamp="2026-08-14T02:11:07" hostname="ci-runner-07"
             time="212.884">
    <properties>
      <property name="branch" value="main"/>
      <property name="runner_os" value="ubuntu-24.04"/>
      <property name="node_version" value="22.5.0"/>
      <property name="ci_run_url" value="https://ci.example/marlow/runs/90412"/>
    </properties>
    <testcase classname="checkout.promo" name="test_stacked_promo_codes"
              file="tests/checkout/test_promo.py" line="118" time="4.902">
      <failure type="AssertionError"
               message="expected status 201 but got 422 - body: {&quot;error&quot;:&quot;PROMO_STACK_LIMIT&quot;,&quot;detail&quot;:&quot;at most 1 stackable code per order&quot;}">
Traceback (most recent call last):
  File "tests/checkout/test_promo.py", line 118, in test_stacked_promo_codes
    assert response.status_code == 201, f"expected status 201 but got {response.status_code}"
  File "app/checkout/orders.py", line 240, in apply_promotions
    raise PromoStackLimit(code=code.id)
AssertionError
      </failure>
    </testcase>
  </testsuite>
</testsuites>

=============== FILE: inbox/ci-thread.md ===============
#build-alerts — 2026-08-14

07:02  bot:    nightly / checkout — FAILED (1 of 41) — run 90412
07:19  sam:    checkout is red again, it says expected 200 got 500 on the promo
               test, pretty sure it's the same flake as last sprint
07:20  sam:    it's on main, build from this morning
07:26  liang:  didn't dana ship the stacking change last sprint? this smells
               like that
07:28  liang:  did anyone run it locally
07:41  sam:    not yet. it passed the run before this one fwiw
07:44  liang:  someone write it up before standup please, I'm in interviews
08:02  dana:   my change was behind a flag, not enabled on main afaik
