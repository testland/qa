---
name: tdd-stuck-pattern-resolver
description: "Pattern catalog for \"I can't write the test first\" moments - recognizes the common testability blockers (singletons / static dependencies, network in constructors, time / random as hidden inputs, deeply nested constructions, untestable boundaries) and proposes specific refactors that make TDD viable (extract interface, dependency injection, seam, ports-and-adapters). Use as TDD coaching for engineers stuck on a specific class of code."
rating: 22
d6: 3
---

# tdd-stuck-pattern-resolver

## Overview

TDD's "write the test first" rule breaks against certain code
shapes. The engineer hits the wall, abandons TDD, writes the code
first, then writes the test second (or skips it). The wall isn't
TDD - it's the code shape.

This skill is a **catalog** of common stuck patterns + the refactor
that unsticks each. It's a coaching reference, not a prescription - 
the engineer picks the appropriate refactor for their codebase.

## When to use

- An engineer says "I can't write the test first for this."
- A pairing session reveals testability gaps.
- A codebase has many "I'll add tests later" comments.
- A new engineer is learning TDD and hits common blockers.

For TDD basics, defer to [Kent Beck's *Test-Driven Development by
Example*][beck-tdd] (the canonical reference). This skill addresses
the second-order problem: the code resists TDD.

[beck-tdd]: https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530

## Pattern 1 - Singleton / static dependency

```javascript
// Stuck — depends on a global database client
function processOrder(orderId) {
  const order = Database.getInstance().findOrder(orderId);   // singleton
  // ...
}
```

**Why it's stuck:** the test can't substitute a fake DB without
modifying global state.

**Refactor - Dependency Injection:**

```javascript
function processOrder(orderId, db) {
  const order = db.findOrder(orderId);
  // ...
}

// Test:
test('processOrder fetches the order', () => {
  const fakeDb = { findOrder: () => ({ id: 1 }) };
  processOrder(1, fakeDb);
});
```

The DB is now injected; the test passes a fake. Production code
calls `processOrder(orderId, Database.getInstance())` from the
single composition root.

## Pattern 2 - Network in constructor

```javascript
// Stuck — constructor side-effects
class OrderService {
  constructor() {
    this.config = await fetch('/config').then(r => r.json());   // 😱
  }
}
```

**Why it's stuck:** instantiating the class to test it triggers
the network call.

**Refactor - push side effects out of construction:**

```javascript
class OrderService {
  constructor(config) {
    this.config = config;
  }
}

// Composition root:
const config = await fetch('/config').then(r => r.json());
const orderService = new OrderService(config);

// Test:
const orderService = new OrderService({ /* fake config */ });
```

Construction = pure assignment. Side effects happen at composition.

## Pattern 3 - Time / random as hidden input

```javascript
// Stuck — uses Date.now() and Math.random() directly
function generateInvoice(items) {
  return {
    id: `INV-${Date.now()}-${Math.random()}`,
    items,
  };
}
```

**Why it's stuck:** the test can't predict the output.

**Refactor - inject the source:**

```javascript
function generateInvoice(items, { now, rand }) {
  return {
    id: `INV-${now()}-${rand()}`,
    items,
  };
}

// Production:
generateInvoice(items, { now: Date.now, rand: Math.random });

// Test:
generateInvoice([item], { now: () => 1000, rand: () => 0.5 });
// Asserts: id === 'INV-1000-0.5'
```

For more comprehensive control, use a `Clock` interface (see
[`db-snapshot-restore`](../../../qa-test-environment/agents/db-snapshot-restore.md)
for a similar pattern with database connections).

## Pattern 4 - Untestable boundaries (file system, OS calls)

```python
# Stuck — direct file system access
def load_config():
    with open('/etc/myapp/config.json') as f:
        return json.load(f)
```

**Why it's stuck:** test setup requires creating files at fixed
paths; tests pollute the filesystem.

**Refactor - Hexagonal / Ports-and-Adapters:**

```python
# Define a port (interface)
class ConfigSource(Protocol):
    def read(self) -> dict: ...

# Production adapter
class FileConfigSource:
    def __init__(self, path):
        self.path = path
    def read(self):
        with open(self.path) as f:
            return json.load(f)

# Test adapter
class FakeConfigSource:
    def __init__(self, config):
        self.config = config
    def read(self):
        return self.config

# Use the port:
def load_config(source: ConfigSource):
    return source.read()
```

Tests inject `FakeConfigSource({...})`; production injects
`FileConfigSource('/etc/...')`.

## Pattern 5 - Deeply nested construction

```typescript
// Stuck — chain of constructions
function processOrder(orderId: string) {
  const repo = new OrderRepo(new DbConnection(new ConfigLoader(new FileReader('/etc/...'))));
  return new OrderService(repo).process(orderId);
}
```

**Why it's stuck:** test setup needs to construct the whole tree.

**Refactor - Factory + composition root:**

```typescript
// Composition root (one place per app)
function buildAppContainer() {
  const reader = new FileReader('/etc/...');
  const config = new ConfigLoader(reader);
  const conn = new DbConnection(config);
  const repo = new OrderRepo(conn);
  const service = new OrderService(repo);
  return { service, /* others */ };
}

// Production:
const { service } = buildAppContainer();
await service.process(orderId);

// Test (just the service, with fakes):
const service = new OrderService(new FakeOrderRepo());
await service.process(orderId);
```

Production composes once at startup; tests skip the entire chain.

## Pattern 6 - Untestable private methods

```kotlin
// Stuck — wants to test a private helper
class OrderProcessor {
    fun process(order: Order) { /* ... */ }
    private fun calculateTotal(items: List<Item>): Double { /* ... */ }
}
```

**Why it's stuck:** the test can't reach the private method
without reflection (a code smell).

**Refactor options:**

**Default: Test through the public interface.** If `calculateTotal`
matters, it affects `process(...)`'s output; test that. Keeps tests
decoupled from implementation. Use the alternatives below only when
this default doesn't fit the situation described.

1. **Test through the public interface** (the default - use unless
   the conditions below apply).

2. **Extract to a separate class** with public methods - use when
   the private logic is genuinely independent and reused, or complex
   enough that public-interface tests can't pin its behaviour:

```kotlin
class TotalCalculator {
    fun calculate(items: List<Item>): Double { /* ... */ }
}

class OrderProcessor(private val totalCalculator: TotalCalculator) {
    fun process(order: Order) {
        val total = totalCalculator.calculate(order.items)
        // ...
    }
}
```

Then `TotalCalculator` is tested directly; `OrderProcessor` tested
with a fake.

3. **Make it `internal`** (Kotlin / Scala) - escape hatch when
   extraction is overkill but reflection is worse; only when the
   language supports module-private visibility.

## Pattern 7 - Async / Promise-heavy code

```javascript
// Stuck — sequential async operations
async function checkout(cart) {
  const tax = await taxService.calculate(cart);
  const charge = await stripe.charge(cart.total + tax);
  await orderRepo.save({ cart, tax, charge });
  await emailService.sendConfirmation(cart.userId);
  return charge;
}
```

**Why it's stuck:** mocking each await; test setup gets long.

**Refactor - split into orchestrator + steps:**

```javascript
async function checkout(cart, deps) {
  const { taxService, stripe, orderRepo, emailService } = deps;
  const tax = await taxService.calculate(cart);
  const charge = await stripe.charge(cart.total + tax);
  await orderRepo.save({ cart, tax, charge });
  await emailService.sendConfirmation(cart.userId);
  return charge;
}
```

Each `deps.X` is injected; tests pass per-test fakes.

For very complex async chains, consider a state machine or saga
pattern - testable as state transitions, not sequential awaits.

## Pattern 8 - Code that calls third-party SDKs

```typescript
// Stuck — direct Stripe SDK call
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_KEY);

async function charge(amount) {
  return await stripe.paymentIntents.create({ amount, currency: 'usd' });
}
```

**Why it's stuck:** SDK instances aren't easily mocked; testing
without real network is hard.

**Refactor - Adapter (don't mock what you don't own per
[`mocking-anti-pattern-detector`](../../../qa-test-review/agents/mocking-anti-pattern-detector.md)):**

```typescript
interface PaymentGateway {
  charge(amount: number): Promise<{ id: string }>;
}

class StripeGateway implements PaymentGateway {
  constructor(private stripe: Stripe) {}
  async charge(amount: number) {
    const intent = await this.stripe.paymentIntents.create({ amount, currency: 'usd' });
    return { id: intent.id };
  }
}

class FakePaymentGateway implements PaymentGateway {
  async charge(amount: number) {
    return { id: 'fake-charge-' + amount };
  }
}
```

Tests use `FakePaymentGateway`; production uses `StripeGateway`.
The team owns the interface; mocking is fine. Per
[`mocking-anti-pattern-detector`](../../../qa-test-review/agents/mocking-anti-pattern-detector.md):
"Don't mock what you don't own."

## Step - Decision tree

```
Is your test setup more than 10 lines?         → Pattern 5 (composition root)
Is your test using `await fetch` / network?    → Pattern 4 (port/adapter) or Pattern 8 (gateway adapter)
Does your code call `Date.now()` / `Math.random()`? → Pattern 3 (inject)
Are you wanting to mock a singleton?            → Pattern 1 (DI)
Constructor does I/O?                           → Pattern 2 (push out)
Async chain with 5+ awaits?                     → Pattern 7 (orchestrator)
Want to test private methods?                   → Pattern 6 (extract or test through public)
```

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping the test first because "this is hard to test"               | Code stays untestable; debt compounds.                                    | Apply one of the patterns. |
| Reflection to access private methods                                  | Couples tests to implementation; refactors break.                        | Test through public interface (Pattern 6). |
| Mocking 5 globals to test one function                                | Brittle; tests verify mocks, not behavior.                               | DI + factory (Patterns 1, 5). |
| "We'll refactor later"                                                | Later never comes.                                                        | Apply pattern incrementally - one method at a time. |
| Big-bang refactor for testability                                     | Risky; tests break for unrelated reasons.                                | Strangler fig - incrementally extract; test new code; old code unchanged. |

## Limitations

- **Patterns are language-agnostic; idioms vary.** Java's DI
  framework (Spring) differs from JS's manual injection.
- **Refactor cost.** Some refactors require touching many files;
  budget accordingly.
- **Architectural-level patterns.** Hexagonal architecture is a
  large commitment; for small projects, simpler patterns suffice.
- **Doesn't replace TDD training.** Apply alongside Beck-style
  TDD coaching, not as a substitute.

## References

- Beck, K., *Test-Driven Development by Example* (2003) - the
  canonical TDD reference.
- *Working Effectively with Legacy Code* by Michael Feathers
  (2004) - the canonical "how to add tests to untestable code"
  reference; introduces the "seam" concept this skill draws from.
- [`mocking-anti-pattern-detector`](../../../qa-test-review/agents/mocking-anti-pattern-detector.md) - sibling: detects the over-mocking that stuck patterns produce.
- [`test-code-conventions`](../../../qa-test-review/skills/test-code-conventions/SKILL.md) - §5 covers the test-double taxonomy this skill references.
