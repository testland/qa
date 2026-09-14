# Generated-case run, PR #4471 branch, 2026-09-14 09:12 UTC

Target: https://api.pallet.com
Document: ./openapi.yaml (7 operations)
5 cases per operation. 35 requests issued. 38.4s. 0 failures reported.

## Response status distribution across the 35 requests

| Status | Count | Notes                                                |
|--------|-------|------------------------------------------------------|
| 429    | 26    | Edge gateway. It sheds anything above 20 requests/sec from a single token. |
| 201    | 6     | 4 x `POST /v1/shipments`, 2 x `POST /v1/manifests`   |
| 200    | 3     | `GET /v1/shipments`                                  |

## Follow-ups filed since the run

- OPS-3390, 09:31 - six records exist in the production database that no
  customer created. Four of them are shipments in `booked` state against the
  account the CI token belongs to. Finance has asked who is unwinding them.
- OPS-3391, 09:44 - the document served at https://api.pallet.com/openapi.json
  lists 10 operations. The copy in the repository lists 7. The three that are
  missing from the repository copy - `POST /v1/manifests/{id}/void`,
  `GET /v1/rates` and `DELETE /v1/shipments/{id}` - were not exercised by this
  run at all.

## The same job on main, last green run before staging went dark

Target: https://staging.pallet.dev
Document: fetched from the target, 10 operations.
200 cases per operation, 4 workers. 2,000 requests. 11m02s. 0 failures.
