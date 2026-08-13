# End-to-end example

Full Node.js test (Jest) for a checkout feature guarded by two flags,
using localhost/offline mode. See [split-io.md](split-io.md) for each pattern in isolation.

```typescript
import path from 'path';
import { SplitFactory } from '@splitsoftware/splitio';

let factory: SplitIO.ISDK;
let client: SplitIO.IClient;

beforeAll(async () => {
  factory = SplitFactory({
    core: { authorizationKey: 'localhost' },
    features: path.join(__dirname, '__fixtures__/split-flags.yml'),
    sync: { impressionsMode: 'NONE' },
  });
  client = factory.client('user-123');
  await client.whenReady();
});

afterAll(async () => {
  await client.destroy();
});

describe('checkout page feature flags', () => {
  it('shows redesigned checkout for on-treatment users', () => {
    expect(client.getTreatment('user-123', 'checkout_redesign')).toBe('on');
  });

  it('returns config for pricing experiment arm', () => {
    const result = client.getTreatmentWithConfig('user-123', 'pricing_experiment');
    expect(result.treatment).toBe('v2');
    expect(JSON.parse(result.config!)).toMatchObject({ price: 9 });
  });

  it('returns control for an undeclared flag', () => {
    expect(client.getTreatment('user-123', 'unrelated_flag')).toBe('control');
  });
});
```

The `__fixtures__/split-flags.yml` file is committed alongside the test.
No `SPLIT_API_KEY` secret is required in CI when using localhost mode.
