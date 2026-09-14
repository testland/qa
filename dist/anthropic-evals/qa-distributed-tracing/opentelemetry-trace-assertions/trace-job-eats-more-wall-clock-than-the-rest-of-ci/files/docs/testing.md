# Notes on the trace tests

@tvance, 2026-07-18.

We put the tests through the same span processor the collector uses in the
deployed environments, deliberately: a test that exercises a different pipeline
from the one production uses is not testing production. Please leave that wiring
alone.

Spans do not turn up in the exporter the instant a call returns, so a test that
reads straight after the exercise sees nothing. `support/flush.js` exists for
that - `await settleSpans()` before every read and it behaves itself.

If you ever need them sooner than that, the processor takes a
`scheduledDelayMillis` and I have run it at 50 elsewhere without trouble.

The 200ms wait in the cart test predates the helper. Same idea.
