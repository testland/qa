# Injection patterns

Substitute a dependency by injecting it at a seam instead of reaching
for a global or a hidden source. Covers stuck Patterns 1, 2, and 3 of
`tdd-stuck-pattern-resolver`.

## Pattern 1 - Singleton / static dependency

```javascript
// Stuck - depends on a global database client
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
// Stuck - constructor side-effects
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
// Stuck - uses Date.now() and Math.random() directly
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

For more comprehensive control, use a `Clock` interface (the
same injection pattern applies to database connections).
