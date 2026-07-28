# OpenFeature testing: Java / Python SDKs and specification tables

Companion reference for `openfeature-sdk-testing`. The SKILL.md spine
shows the full TypeScript/Node.js flow; the flow is identical here,
only the API names differ.

## Java

**Install** (Maven, per
[github.com/open-feature/java-sdk README](https://github.com/open-feature/java-sdk/blob/main/README.md)):

```xml
<dependency>
  <groupId>dev.openfeature</groupId>
  <artifactId>sdk</artifactId>
  <version>1.20.2</version>
</dependency>
```

**Configure the InMemoryProvider:**

```java
import dev.openfeature.sdk.OpenFeatureAPI;
import dev.openfeature.sdk.Client;
import dev.openfeature.sdk.providers.memory.Flag;
import dev.openfeature.sdk.providers.memory.InMemoryProvider;

Map<String, Flag<?>> flags = new HashMap<>();
flags.put("show-new-ui", Flag.builder()
    .variant("on", true)
    .variant("off", false)
    .defaultVariant("on")
    .build());

OpenFeatureAPI api = OpenFeatureAPI.getInstance();
api.setProviderAndWait(new InMemoryProvider(flags));
Client client = api.getClient();
```

**Evaluate flags:**

```java
boolean enabled = client.getBooleanValue("show-new-ui", false);

FlagEvaluationDetails<Boolean> details =
    client.getBooleanDetails("show-new-ui", false);
// details.getValue()    - resolved value
// details.getVariant()  - "on" or "off"
// details.getReason()   - "STATIC", "DEFAULT", etc.
// details.getErrorCode()- ErrorCode.FLAG_NOT_FOUND, TYPE_MISMATCH, etc.
```

**Per-invocation evaluation context:**

```java
Map<String, Value> attrs = new HashMap<>();
attrs.put("email", new Value("user@example.com"));
EvaluationContext ctx = new ImmutableContext("user-42", attrs);
boolean value = client.getBooleanValue("beta-access", false, ctx);
```

## Python

**Install** (per
[github.com/open-feature/python-sdk README](https://github.com/open-feature/python-sdk/blob/main/README.md)):

```bash
pip install openfeature-sdk==0.10.0
```

**Configure the InMemoryProvider:**

```python
from openfeature import api
from openfeature.provider.in_memory_provider import InMemoryFlag, InMemoryProvider

flags = {
    "show-new-ui": InMemoryFlag(
        default_variant="on",
        variants={"on": True, "off": False}
    ),
}

api.set_provider_and_wait(InMemoryProvider(flags))
client = api.get_client()
```

**Evaluate flags:**

```python
enabled = client.get_boolean_value("show-new-ui", False)

details = client.get_boolean_details("show-new-ui", False)
# details.value       - resolved value
# details.variant     - "on" / "off"
# details.reason      - "STATIC", "DEFAULT", etc.
# details.error_code  - "FLAG_NOT_FOUND", "TYPE_MISMATCH", etc.
```

**Per-invocation evaluation context:**

```python
from openfeature.evaluation_context import EvaluationContext
ctx = EvaluationContext(targeting_key="user-42",
                        attributes={"email": "user@example.com"})
details = client.get_boolean_details("beta-access", False, ctx)
```

## EvaluationDetails and reason codes

Per the OpenFeature specification
([openfeature.dev/specification/sections/flag-evaluation](https://openfeature.dev/specification/sections/flag-evaluation),
Requirements 1.4.3-1.4.15), `EvaluationDetails` carries:

| Field | Type | Meaning |
|---|---|---|
| `value` | T | Resolved flag value (spec req. 1.4.3) |
| `flagKey` | string | The requested flag identifier (1.4.5) |
| `variant` | string | Provider-supplied variant name (1.4.6) |
| `reason` | string | Resolution rationale (1.4.7) |
| `errorCode` | enum | Failure classification (1.4.8) |
| `errorMessage` | string | Optional context for the error (1.4.13) |
| `flagMetadata` | map | Immutable provider-supplied data (1.4.14) |

Canonical reason values (per
[openfeature.dev/specification/sections/providers](https://openfeature.dev/specification/sections/providers),
Requirement 2.2.5):
`STATIC`, `DEFAULT`, `TARGETING_MATCH`, `SPLIT`, `CACHED`,
`DISABLED`, `UNKNOWN`, `STALE`, `ERROR`.

Canonical error codes include `FLAG_NOT_FOUND`, `TYPE_MISMATCH`,
`PARSE_ERROR`, `TARGETING_KEY_MISSING`, `INVALID_CONTEXT`, `GENERAL`,
`PROVIDER_NOT_READY`, `PROVIDER_FATAL`.

## Hook lifecycle stages and execution order

Per
[openfeature.dev/docs/reference/concepts/hooks](https://openfeature.dev/docs/reference/concepts/hooks)
and the specification
([openfeature.dev/specification/sections/hooks](https://openfeature.dev/specification/sections/hooks),
Requirement 4.3.1-4.3.8), the four stages are:

| Stage | Runs when |
|---|---|
| `before` | Before flag resolution; can modify evaluation context |
| `after` | After successful resolution; can validate the returned value |
| `error` | On resolution failure or unhandled before-hook error |
| `finally` | Unconditionally after all other stages |

Execution order for `before`: API - Client - Invocation. For `after`,
`error`, `finally`: reverse order (Invocation - Client - API), per
specification Requirement 4.4.2.
