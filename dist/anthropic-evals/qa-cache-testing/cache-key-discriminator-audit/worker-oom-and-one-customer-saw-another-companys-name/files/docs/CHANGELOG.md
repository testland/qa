# Changelog

## 4.2.0 - 2026-06-30

- `CatalogRepo` now goes through the shared connection registry, so it has to be
  hashable and comparable. Two requests for the same region reuse one pooled
  connection instead of opening one each.
- `PricingEngine.quote` memoised. Seat quotes were being recomputed on every
  keystroke in the plan picker; `maxsize` set to 8192 after a load test.
- Catalogue reads memoised at `maxsize=2048`.

## 4.1.3 - 2026-05-18

- Feature flags moved off the per-request fetch onto the request context.

## 4.1.0 - 2026-04-02

- Worker split out of the web process.
