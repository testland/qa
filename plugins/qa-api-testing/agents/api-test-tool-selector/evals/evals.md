---
component: api-test-tool-selector
type: agent
---

# api-test-tool-selector - evals

Companion eval cases for [`api-test-tool-selector`](../../api-test-tool-selector.md).
Three cases covering happy path (Schemathesis from OpenAPI) + branch (Postman for
spec-less REST) + adversarial (contract-testing request out of scope).

## Eval 1: happy path - Schemathesis driven by an OpenAPI spec

**Input:**
- Project root contains `openapi.yaml` describing 23 endpoints.
- Goal: "functional smoke testing - exercise every documented operation."
- Team stack: Python + pytest.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Recommends **Schemathesis** as the primary tool. Rationale: spec-driven fuzzing exercises every documented operation automatically; Python-native; integrates with pytest. Read next: `schemathesis-fuzzing`. Lists "team drops OpenAPI spec → switch to Tavern or hand-write cases" as the flip condition.

**Pass condition:** Output contains the literal substrings `Schemathesis` AND (`OpenAPI` OR `openapi.yaml`) AND `schemathesis-fuzzing` and does NOT recommend RESTler as the primary (RESTler is for spec-less REST).

## Eval 2: branch - Postman + Newman for a JS team without an OpenAPI spec

**Input:**
- Project root contains `package.json` with `"newman"` and `"postman-collections"` in scripts, plus an existing `*postman_collection.json` file.
- No `openapi.yaml` or `.proto` or `.graphql`.
- Goal: "functional smoke testing."

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Recommends **Postman + Newman** as the primary tool. Rationale: collection-driven, fits the JS team stack, leverages the existing `*postman_collection.json`. Read next: `postman-collections`. Mentions Karate as the secondary fallback if the team wants a programmatic DSL instead of GUI-authored collections.

**Pass condition:** Output contains the literal substrings `Postman` AND `Newman` AND `postman-collections` and does NOT recommend Schemathesis (no spec) or REST Assured (wrong stack).

## Eval 3: adversarial - request for contract testing

**Input:**
- Goal: "test the contract between the orders service (consumer) and the inventory service (provider)."
- Project root contains a `pacts/` directory with `consumer-provider.json` files (Pact format).

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to recommend a functional API tool. Explains that contract testing is a separate concern handled by `qa-contract-testing/contract-test-scaffolder`. Does NOT recommend any tool from this plugin (Postman / REST Assured / Karate / Tavern / Schemathesis / RESTler / API Chaos Runner) - they all do functional testing against a live endpoint, not consumer/provider contracts.

**Pass condition:** Output contains the literal substring `contract-test-scaffolder` OR (`contract testing` AND `qa-contract-testing`) and does NOT contain "Recommended tool: " followed by Postman / REST Assured / Karate / Tavern / Schemathesis / RESTler / API Chaos Runner as the primary.

## Notes

- Eval file lives outside the lint glob - no rating frontmatter needed.
- Pass conditions are literal-string checks; a reviewer can grep transcripts.
- Target-model dates are eval-authoring dates (2026-05-25), not execution dates.
