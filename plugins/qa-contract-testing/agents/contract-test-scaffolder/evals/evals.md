---
component: contract-test-scaffolder
type: agent
---

# contract-test-scaffolder - evals

Companion eval cases for [`contract-test-scaffolder`](../../contract-test-scaffolder.md).
Three cases cover happy path / branch / adversarial: scaffolding a Pact-JS
consumer test from an OpenAPI spec (default strategy), scaffolding a
`buf breaking` baseline runner from a `.proto` (different target shape),
and a refusal when no contract artifact is supplied.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates recorded below are
the eval-authoring date.

## Eval 1 - happy path - Pact-JS consumer from OpenAPI

**Input:**

```
Scaffold contract tests from this artifact.

Artifact: openapi.yaml (excerpt below)
Direction: consumer
Target framework: Pact-JS + Jest

```yaml
openapi: 3.1.0
info: { title: cart-service, version: 1.0.0 }
paths:
  /api/cart/items:
    post:
      operationId: addCartItem
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [sku, qty]
              properties:
                sku: { type: string }
                qty: { type: integer, minimum: 1 }
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                type: object
                required: [sku, qty, addedAt]
                properties:
                  sku:     { type: string }
                  qty:     { type: integer }
                  addedAt: { type: string, format: date-time }
        '400': { description: invalid payload }
        '401': { description: unauthorized }
```

Consumer name: web-app
Provider name: cart-service
OpenAPI examples: NONE supplied (no `examples:` block).
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Step 1 detects OpenAPI (jq filter passes). Step 2
picks Pact consumer as the default strategy. Step 3 emits a
Pact-JS spec at the documented path
(`tests/contracts/cart-service.consumer.spec.ts`) that imports
`Pact` from `@pact-foundation/pact`, constructs the provider with
`consumer: 'web-app', provider: 'cart-service'`, and emits ONE
`addInteraction` per documented response code (201, 400, 401 - 3
interactions in total). Because no OpenAPI `examples:` block was
supplied, every payload field is emitted as an `INPUT-NEEDED`
placeholder with the JSON Schema fragment quoted as a comment - 
the agent does NOT invent example values like `'SKU-001'`. Step 4
appends a `HAND-OFF` block.

**Pass condition:** Output contains the literal string
`@pact-foundation/pact` AND `consumer: 'web-app'` AND
`provider: 'cart-service'` AND at least 3 occurrences of
`addInteraction` (one per response code) AND `INPUT-NEEDED` AND
`HAND-OFF`. Output does NOT contain the literal value `SKU-001`
(the agent must not invent payload examples absent from the
artifact).

## Eval 2 - branch - Protobuf `buf breaking` runner

**Input:**

```
Scaffold contract tests from this artifact.

Artifact: cart.proto (excerpt below)
Direction: provider
Target framework: CI (`buf breaking` runner; no per-language test
  framework needed beyond a GitHub Actions YAML step)

```proto
syntax = "proto3";
package cart.v1;

service CartService {
  rpc AddItem (AddItemRequest) returns (AddItemResponse) {}
  rpc RemoveItem (RemoveItemRequest) returns (RemoveItemResponse) {}
}

message AddItemRequest  { string sku = 1; int32 qty = 2; }
message AddItemResponse { string sku = 1; int32 qty = 2; string added_at = 3; }
message RemoveItemRequest  { string sku = 1; }
message RemoveItemResponse { bool removed = 1; }
```

Repo signal: `buf.yaml` exists at repo root (not `protoc-gen-validate`).
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Step 1 detects Protobuf (filename ends in `.proto`).
Step 2 picks the `buf breaking` provider strategy (per the agent's
"Defaulting to `protoc-gen-validate` when repo has `buf` → Use
what's already there" anti-pattern; the input confirms `buf.yaml`
exists). Step 3 emits the two-step `buf` runner: a one-shot
`buf build -o proto-baseline.bin` lock step plus a CI step
`buf breaking --against proto-baseline.bin`. Does NOT scaffold a
Pact-JS consumer test (which would be the wrong shape for a
Protobuf artifact). Step 4 appends a `HAND-OFF` block.

**Pass condition:** Output contains the literal string
`buf breaking` AND `--against` AND `proto-baseline.bin` AND
`buf build`. Output does NOT contain `@pact-foundation/pact` and
does NOT contain `addInteraction` (those belong to the
Pact-JS / OpenAPI branch and would mean the agent picked the
wrong strategy).

## Eval 3 - adversarial - no contract artifact supplied (refuse)

**Input:**

```
Scaffold contract tests for our cart service. I don't have an OpenAPI
spec, a GraphQL schema, or a .proto file — just generate something
reasonable from what you know about cart APIs (POST /items, DELETE
/items/:sku, etc.).

Direction: consumer
Target framework: Pact-JS + Jest
Consumer name: web-app
Provider name: cart-service
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to scaffold. Cites the persona of the agent
("Generates the tests; engineer fills the values - does not invent
contract behavior the artifact does not declare") and the
Refuse-to-proceed rule ("invent example payloads"). No artifact
means no `addInteraction` can be derived from documented
responses; the agent does NOT emit a Pact-JS spec, does NOT
fabricate operations like `POST /items` from prior knowledge.
Asks the user to supply at least one of:
OpenAPI 3.x / GraphQL SDL / `.proto` / existing Pact JSON.

**Pass condition:** Output contains at least one of `refuse` /
`Refuse` / `cannot proceed` / `will not` / `cannot scaffold` AND
mentions at least one of `OpenAPI` / `GraphQL` / `.proto` /
`Pact JSON` / `artifact`. Output does NOT contain
`addInteraction` (the agent must not emit a Pact spec body
fabricated from prior knowledge) and does NOT contain
`POST /items` as part of a scaffolded test body.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (OpenAPI YAML,
  Protobuf, or an explicit "no artifact" prompt). No external repos
  to clone; the agent's output is files + a markdown report that
  can be graded by literal-substring matching.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Write`, `Edit`, `Grep`, `Glob`,
  narrow `Bash(jq *)` / `Bash(npx schemathesis *)` /
  `Bash(uvx schemathesis *)` / `Bash(buf *)` / `Bash(oasdiff *)`)
  may write files into the eval workspace but does not need network
  access - the schemathesis / buf binaries are only invoked when
  asked, and eval 3 explicitly tests the refuse path with no
  artifact.
- Eval cases were authored 2026-05-26 against the v3.0 / v4.0
  framework's D7 sub-checks (Evals exist, Multi-model coverage,
  Acceptance criteria, Adversarial coverage, Reproducibility).
