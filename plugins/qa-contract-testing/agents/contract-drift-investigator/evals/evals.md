---
component: contract-drift-investigator
type: agent
---

# contract-drift-investigator - evals

Companion eval cases for [`contract-drift-investigator`](../../contract-drift-investigator.md).
Three cases cover happy path / branch / adversarial: an OpenAPI rename
finding (category `schema-rename`), a Pact provider-state failure
(category `data-fixture`), and an out-of-scope input that has no
contract surface (refuse to investigate). Re-run by feeding the
**Input** block as the first user message and checking the agent's
output against the **Pass condition**.

Target models for re-runs: `sonnet`, `haiku`, `opus`. Dates recorded
below are the eval-authoring date - each case is designed to be
reproducible against any tier.

## Eval 1 - happy path - OpenAPI rename without alias (schema-rename)

**Input:**

```
Contract gate failed. Investigate.

Surface detection:
  ./pacts/             absent
  openapi.yaml         present (root)
  schema.graphql       absent
  **/*.proto           absent

Last-known-green: commit `def5678` (2026-04-30) on `main`.
Current: commit `abc1234` on PR #42.

`oasdiff breaking openapi.base.yaml openapi.yaml --format json` output:
[
  {
    "id": "request-property-removed",
    "path": "/orders",
    "operation": "POST",
    "source": "openapi.yaml",
    "level": "ERR",
    "message": "removed the request property 'customer_email' from POST /orders"
  },
  {
    "id": "request-property-added",
    "path": "/orders",
    "operation": "POST",
    "source": "openapi.yaml",
    "level": "INFO",
    "message": "added the request property 'customer.email' to POST /orders"
  }
]

`git log -p -- openapi.yaml` shows commit abc1234:
  commit abc1234 (PR #42)
  Author: alice@example.com
  Date:   2026-05-24

      Rename customer_email to customer.email (nest under customer object)

No `deprecated: true` field on either spelling in the new spec.
No release-notes entry mentioning a deprecation alias.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 detects the OpenAPI surface only. Step 3 runs
oasdiff and observes one removal + one addition on the same operation
with name overlap. Step 4 classifies the finding as `schema-rename`
(per the table: "Field renamed in OpenAPI / GraphQL / Protobuf without
keeping the old name as an alias. `git log` shows a single rename
commit."). Step 5 identifies the introducing commit (`abc1234` /
PR #42). Step 6 emits the findings table with surface `openapi`,
tool `oasdiff`, and recommends restoring `customer_email` as a
deprecated alias for one release before the v2 cutover. Matches the
"Example 1" pattern in the agent body.

**Pass condition:** Output contains the literal string `schema-rename`
AND the literal string `customer_email` AND the literal string
`abc1234` AND mentions either `deprecat` (prefix of
deprecated/deprecation) or `alias`. Output does NOT classify the
finding as `schema-removal` only (i.e., must not emit a
`schema-removal` row for `customer_email` without also emitting the
`schema-rename` category).

## Eval 2 - branch - Pact provider-state failure (data-fixture)

**Input:**

```
Contract gate failed. Investigate.

Surface detection:
  ./pacts/             present (consumer: web-app, provider: pet-service)
  openapi.yaml         absent
  schema.graphql       absent
  **/*.proto           absent

Last-known-green (per Pact Broker matrix can-i-deploy):
  consumer version pre-PR-sha, provider version prod-deploy-sha
Current:
  consumer version PR-sha, provider version prod-deploy-sha
(provider version unchanged across the two rows)

pact_verifier_log.txt:
  Verifying a pact between web-app and pet-service
    Given I have a list of dogs
      request for all dogs
        with GET /dogs
          returns a response which
            has status code 200 (OK)
            has a matching body (FAILED - actual: [], expected: [dog1, dog2])

`git log -p -- provider/state-handlers.ts` (last 10 commits):
  commit xyz789 — "Gate dogs fixture seeding behind FEATURE_FIXTURES
  env-var" — 3 weeks ago. Wraps:
    db.dogs.bulkInsert([...])
  into:
    if (process.env.FEATURE_FIXTURES) { db.dogs.bulkInsert([...]) }
  No commits since.

CI verifier env: FEATURE_FIXTURES is not set.

Pact pact file (pacts/web-app-pet-service.json) `uponReceiving` for
"request for all dogs" is unchanged from last-known-green.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 detects the Pact surface. Step 3 reads the
verifier log and identifies that the provider-state hook
`given('I have a list of dogs')` returned an empty list. Step 4
classifies as `data-fixture` (per the table: "Pact provider-state
hook didn't seed the data the consumer expects - `given(...)` returned
empty"). Step 5 identifies the introducing commit (`xyz789`, ~3 weeks
ago, on `provider/state-handlers.ts`). The consumer pact file is
unchanged, so the agent must NOT classify this as
`consumer-expectation`. Step 6 emits the findings table with surface
`pact`, tool `pact`, and recommends restoring unconditional seeding OR
setting `FEATURE_FIXTURES` in verification CI. Matches the
"Example 2" pattern in the agent body.

**Pass condition:** Output contains the literal string `data-fixture`
AND the literal string `xyz789` AND mentions one of `FEATURE_FIXTURES` /
`unconditional` / `state handler` / `state-handlers.ts`. Output does
NOT classify the finding as `consumer-expectation` AND does NOT
classify the finding as `provider-implementation`.

## Eval 3 - adversarial - no contract surface present (refuse)

**Input:**

```
Our CI is failing. Investigate the contract drift.

Surface detection:
  ./pacts/             absent
  openapi.yaml         absent
  openapi.json         absent
  schema.graphql       absent
  **/*.graphql         no matches
  **/*.proto           no matches
  buf.yaml             absent

`git ls-files | grep -Ei 'pact|openapi|schema\.graphql|\.proto$'` → empty.

The failing CI step is named "contract-test" but the script it runs is:
  jest --testPathPattern=tests/integration

There is no consumer contract artifact, no published provider spec, no
schema file under version control. The team is doing classic integration
tests against a staging server.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 finds no contract surface (no pacts directory, no
OpenAPI file, no GraphQL SDL, no Protobuf). The agent refuses to
fabricate a `surface:` line or run any of the per-surface diff tools
(oasdiff, buf, pact, graphql-inspector) against a non-existent
artifact. The agent reports that the failing job is not actually a
contract test (it runs `jest` against integration tests, which is the
consumer-driven-contract anti-pattern of conflating integration with
contract testing), and recommends authoring a real contract artifact
(Pact pact, OpenAPI spec, GraphQL SDL, or Proto) before re-running
this agent. Names the closest sibling skill / agent for the actual
work (one of `pact-contract-testing`, `openapi-contract-diff`,
`graphql-schema-regression`, `protobuf-compat-checking`).

**Pass condition:** Output mentions `no contract surface` OR `no
contract artifact` OR `no pact` OR `no OpenAPI` (one of these
phrasings) AND mentions at least one of the four skills
(`pact-contract-testing` / `openapi-contract-diff` /
`graphql-schema-regression` / `protobuf-compat-checking`). Output does
NOT emit a findings table with any of the seven drift categories
(`provider-implementation`, `schema-rename`, `schema-removal`,
`schema-narrowing`, `consumer-expectation`, `data-fixture`,
`version-skew`).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a consumer or provider repository.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (including category names
  from the agent's own table).
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow
  `Bash(git diff|log|show *)`, `Bash(jq *)`, `Bash(buf *)`,
  `Bash(oasdiff *)`) is read-only - eval re-runs cannot modify
  contract artifacts or git history.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
