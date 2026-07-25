# Waiver lifecycle

Deep reference for the `secrets-baseline-manager` skill - the human process
behind each `.secrets-waivers.yaml` entry. The finding-triage step enforces
expiry at scan time; this file defines who approves a waiver, how long it may
live, and how it is renewed before it lapses.

## Approval authority

| Risk tier | Who can approve |
|---|---|
| Test fixture (never deployed, no real access) | Any team member with repo write |
| Historical commit (rotated, no current risk) | Team lead |
| Live file, awaiting rotation | Security team + sign-off from affected team |

## Expiry guidance

| Scenario | Suggested `expires:` window |
|---|---|
| Test fixture, confirmed inert | Up to 12 months; renew annually |
| Historical commit, rotated credential | Up to 6 months; re-verify rotation |
| Temporarily deferred rotation | 30 days max; no extension without re-approval |

## Renewal process

Before `expires:` lapses, the waiver owner must:

1. Confirm the finding is still inert (test only, rotated, etc.).
2. Update `expires:` to a new date and `approved_by:` to current approver.
3. Open a PR so the update is reviewed before the old date passes.

An expired waiver is treated by the triage step as if it does not exist - the
underlying finding becomes active and blocks the next scan verdict.
