# CI trace without a display

## Problem Description

`tests/checkout/apply-coupon.spec.ts` (Playwright 1.65) failed on CI only. The CI
artifact is downloaded and the trace is at
`test-results/checkout-apply-coupon-chromium/trace.zip`. The coding agent that
will investigate runs in a terminal with no display.

## Output Specification

Write `debug-plan.md` listing the exact commands, in order, to find the failing
step, see expected versus received, and look at the page at that moment, plus
how to step through the test live if the trace is not enough.
