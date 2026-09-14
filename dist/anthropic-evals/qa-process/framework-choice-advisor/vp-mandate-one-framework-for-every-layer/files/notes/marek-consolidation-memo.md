# Consolidation memo - M. Nowak, contractor - 2026-09-04

One runner, everything on it. I have done this twice before.

- Web: straightforward. The specs port over; the locator API differs but the
  shape is the same.
- Android: drive the app through the mobile driver instead of the in-process
  instrumentation. Same taps, same assertions.
- Billing API: the runner can issue HTTP requests, so the Java tests can be
  rewritten as request specs in TypeScript and the billing team stops needing
  its own toolchain.
- Load: the runner can loop requests under concurrency. It is not a dedicated
  load tool, but it would remove the fourth stack.

Estimate: one quarter with two people. I am here until 19 December and would
want to start with the web port.
