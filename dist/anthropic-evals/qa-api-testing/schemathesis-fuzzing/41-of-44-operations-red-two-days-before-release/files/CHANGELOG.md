# Halcyon Payouts API

## 9.2.0 - 2026-08-28

- **Breaking for JSON clients.** Monetary amounts are now serialised as
  decimal strings rather than integers everywhere `Money` appears in a
  response. Large payouts were losing precision in browser clients that parse
  JSON numbers as doubles. Integrators were notified on 2026-08-14 and the
  three largest have confirmed they parse strings. This is deliberate and it
  is not being reverted.
- Added `POST /v1/recipients` bulk validation.

## 9.1.0 - 2026-08-06

- `GET /v1/payouts` gained `settlement_date` filtering.
