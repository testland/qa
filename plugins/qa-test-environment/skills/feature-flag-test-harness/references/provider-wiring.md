# Provider wiring - OpenFeature in-memory provider

Per [openfeature-providers][of-prov], "Providers are responsible for
performing flag evaluations" - the in-memory test provider returns
the flag values the test wants.

[of-prov]: https://openfeature.dev/docs/reference/concepts/provider

## Node / TypeScript

```typescript
// tests/harness/flag-harness.ts
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';

export function withFlags(flags: Record<string, unknown>) {
  const provider = new InMemoryProvider(
    Object.fromEntries(
      Object.entries(flags).map(([k, v]) => [k, {
        defaultVariant: 'configured',
        variants: { configured: v },
        disabled: false,
      }]),
    ),
  );
  return OpenFeature.setProviderAndWait(provider);
}
```

Then in the test setup:

```typescript
import { withFlags } from './harness/flag-harness';

beforeAll(async () => {
  await withFlags(JSON.parse(process.env.FLAGS_JSON || '{}'));
});
```

## Python

```python
# tests/harness/flag_harness.py
from openfeature.api import set_provider
from openfeature.provider.in_memory_provider import InMemoryProvider, InMemoryFlag

def with_flags(flags: dict):
    set_provider(InMemoryProvider({
        k: InMemoryFlag(default_variant='configured',
                        variants={'configured': v})
        for k, v in flags.items()
    }))
```

## Java

```java
import dev.openfeature.sdk.OpenFeatureAPI;
import dev.openfeature.contrib.providers.memory.InMemoryProvider;

@BeforeAll
static void wireFlags() {
    var flags = parseEnv(System.getenv("FLAGS_JSON"));  // your JSON parser
    OpenFeatureAPI.getInstance().setProvider(new InMemoryProvider(flags));
}
```

## Evaluation API

The application code calls the standard OpenFeature evaluation API
([openfeature-eval][of-eval]):

[of-eval]: https://openfeature.dev/docs/reference/concepts/evaluation-api

```typescript
const client = OpenFeature.getClient();
const enabled = await client.getBooleanValue('new_checkout', false);
```

Per [openfeature-eval][of-eval]: "the default value must also be
specified ... In the case of any error during flag evaluation, the
default value will be returned, so give consideration to your
default values!" The harness picks the value the in-memory provider
returns; the application's hard-coded default is what runs in
prod-flag-failure scenarios.
