# Structural patterns

Restructure how the code is assembled or sequenced so a test can reach
the unit under test without rebuilding the world. Covers stuck Patterns
5, 6, and 7 of `tdd-stuck-pattern-resolver`.

## Pattern 5 - Deeply nested construction

```typescript
// Stuck - chain of constructions
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
// Stuck - wants to test a private helper
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
// Stuck - sequential async operations
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
