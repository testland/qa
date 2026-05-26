---
component: mocking-anti-pattern-detector
type: agent
archetype: A3
---

# mocking-anti-pattern-detector — evals

Companion eval cases for [`mocking-anti-pattern-detector`](../../mocking-anti-pattern-detector.md).
Three cases cover happy path / branch / adversarial: over-mocking and
mocking-what-you-don't-own flagged with concrete recommendations,
state-verification tests with no anti-pattern findings, and a contract
test path that triggers the refuse-to-proceed rule (contract tests
legitimately use the patterns flagged as anti-patterns). Re-run by
pasting the **Input** block as the first user message and checking the
agent's output against the **Pass condition**.

## Eval 1 — happy path — over-mocking + mock-what-you-don't-own

**Input:**

```
Review mocking patterns in this Jest test file (the only file in the PR
diff). The team's package.json `dependencies` block includes `lodash`
and `@aws-sdk/client-ses` (third-party); `@my-org/cart-repo` is a
sibling workspace package the team owns.

// checkout.spec.ts
import { jest } from '@jest/globals';
import { Cart } from '../src/cart';

jest.mock('lodash');
jest.mock('@aws-sdk/client-ses');

describe('Cart checkout', () => {
  it('logs and increments item count', () => {
    const mockLogger = jest.fn();
    const cart = new Cart({ logger: mockLogger });

    cart.addItem({ sku: 'BOOK-001', qty: 1 });

    expect(cart.itemCount).toBe(1);
    // No assertion on mockLogger anywhere.
  });

  it('dispatches send / format / parse on submit', () => {
    const mockGateway = {
      send: jest.fn(),
      format: jest.fn(),
      parse: jest.fn(),
    };
    const cart = new Cart({ gateway: mockGateway });

    cart.submit();

    expect(mockGateway.send).toHaveBeenCalled();
    expect(mockGateway.format).toHaveBeenCalled();
    expect(mockGateway.parse).toHaveBeenCalled();
  });
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 identifies Jest mock primitives. Step 2 flags
`mockLogger` as an **over-mock** (mock created but only state asserted
via `cart.itemCount` — recommend replacing with a no-op stub). Step 3
flags the `send` / `format` / `parse` triple as **behavior-verification
leakage** (asserts on dispatch internals — recommend asserting on
caller-observable state). Step 5 flags `jest.mock('lodash')` and
`jest.mock('@aws-sdk/client-ses')` as **mock-what-you-don't-own** (both
are third-party `dependencies`; recommend wrapping in a team-owned
adapter or using `pact-contract-testing` at the boundary). Output cites
Fowler's `mocks-stubs` article.

**Pass condition:** Output contains the literal string `over-mock` (or
`Over-mock`) AND at least one of `Behavior verification leakage` /
`behavior-verification leakage` AND `mock what you don't own` /
`mock-what-you-don't-own` / `Mocking what you don't own`. Output names
at least one of the third-party modules (`lodash` / `@aws-sdk/client-ses`).

## Eval 2 — branch — state verification only (no anti-pattern findings)

**Input:**

```
Review mocking patterns in this Vitest test file (the only file in the
PR diff). The team owns the `@my-org/repos` package (workspace
sibling). There are no third-party mocks.

// cart.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Cart } from '../src/cart';
import { InMemoryCartRepo } from '../src/repos/in-memory-cart-repo';

describe('Cart', () => {
  let repo: InMemoryCartRepo;

  beforeEach(() => {
    repo = new InMemoryCartRepo();
  });

  it('persists an added item', async () => {
    const cart = new Cart({ repo });
    await cart.addItem({ sku: 'BOOK-001', qty: 1 });

    const saved = await repo.findById(cart.id);
    expect(saved.items).toEqual([{ sku: 'BOOK-001', qty: 1 }]);
  });

  it('totals match after two items added', async () => {
    const cart = new Cart({ repo });
    await cart.addItem({ sku: 'BOOK-001', qty: 1, price: 10 });
    await cart.addItem({ sku: 'BOOK-002', qty: 2, price: 5 });

    const saved = await repo.findById(cart.id);
    expect(saved.total).toBe(20);
  });
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 finds zero mock-setup primitives — no `vi.fn()`,
`jest.mock(...)`, `Mock()`, `spy()`, or `when(...)` calls.
`InMemoryCartRepo` is a fake (state-bearing in-memory implementation)
per Rule 3, exactly the pattern the agent recommends. Step 2-6 find
no over-mocks, no behavior-verification leakage, no mock chains, no
mock-what-you-don't-own, and no fake-candidate clusters. The findings
table reports 0 across all anti-pattern rows.

**Pass condition:** Output explicitly indicates zero findings — contains
one of `no anti-patterns` / `0 findings` / `Test doubles found: 0` /
`no findings detected` (case-insensitive) OR every anti-pattern row in
the findings table reports a count of 0. Output does NOT recommend
replacing `InMemoryCartRepo` with a mock or naming any specific
finding (`over-mock`, `behavior-verification leakage`, `mock chain`,
`mock-what-you-don't-own`, `fake-candidate`).

## Eval 3 — adversarial — refuse on contract-test path

**Input:**

```
Review mocking patterns in this Pact consumer test file (the only file
in the PR diff). It lives at tests/contract/order-service.pact.spec.ts.

// tests/contract/order-service.pact.spec.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { OrderClient } from '../../src/clients/order-client';

const provider = new PactV3({
  consumer: 'CartService',
  provider: 'OrderService',
});

describe('OrderService consumer contract', () => {
  it('expects a 201 from POST /orders', async () => {
    provider
      .given('a registered user exists')
      .uponReceiving('a request to create an order')
      .withRequest({
        method: 'POST',
        path: '/orders',
        body: { sku: 'BOOK-001', qty: 1 },
      })
      .willRespondWith({
        status: 201,
        body: { id: MatchersV3.uuid() },
      });

    await provider.executeTest(async (mockServer) => {
      const client = new OrderClient(mockServer.url);
      const result = await client.createOrder({ sku: 'BOOK-001', qty: 1 });
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the Refuse-to-proceed rule "Operate on tests in
`tests/contract/` paths — contract tests legitimately use the patterns
this agent flags as anti-patterns (the patterns ARE the contract),"
the agent refuses to issue a mocking anti-pattern verdict. The file
path is `tests/contract/order-service.pact.spec.ts`; the `provider`
setup chain (`given(...).uponReceiving(...).withRequest(...).willRespondWith(...)`)
is functionally a mock chain in the format Step 4 would flag, but Pact
contract tests legitimately define the contract this way. Output names
the contract-test exemption and does NOT emit a findings table with
anti-pattern rows.

**Pass condition:** Output contains one of `tests/contract` /
`contract test` / `contract-test` (case-insensitive) AND mentions
`refuse` / `skip` / `out of scope` / `exempt` (case-insensitive).
Output does NOT contain any of `over-mock` / `Behavior verification
leakage` / `Mock chain` / `Mocking what you don't own` /
`Fake-candidate` as a findings-table row. The agent must not claim
to flag mock-chain patterns in a Pact contract test — that is the
entire adversarial point of the eval.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no external
  fixtures, no need to clone a sample repo. Tool surface (`Read`,
  `Grep`, `Glob`) is read-only.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
