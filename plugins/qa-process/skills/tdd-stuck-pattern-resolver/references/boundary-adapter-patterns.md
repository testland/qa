# Boundary and adapter patterns

Wrap an external boundary you don't own - the file system, OS calls, or
a third-party SDK - behind an interface you do own, then inject a fake
in tests. Covers stuck Patterns 4 and 8 of `tdd-stuck-pattern-resolver`.

## Pattern 4 - Untestable boundaries (file system, OS calls)

```python
# Stuck - direct file system access
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

## Pattern 8 - Code that calls third-party SDKs

```typescript
// Stuck - direct Stripe SDK call
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_KEY);

async function charge(amount) {
  return await stripe.paymentIntents.create({ amount, currency: 'usd' });
}
```

**Why it's stuck:** SDK instances aren't easily mocked; testing
without real network is hard.

**Refactor - Adapter (don't mock what you don't own):**

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
The team owns the interface; mocking is fine - don't mock what
you don't own.
