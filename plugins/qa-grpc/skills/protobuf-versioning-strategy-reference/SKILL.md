---
name: protobuf-versioning-strategy-reference
description: "Pure-reference catalog of protobuf3 versioning rules and breaking-change categories. Covers field-number reservation (must reserve on delete, 1..536870911 range, 19000-19999 reserved), wire-safe vs wire-incompatible changes (adding/removing fields safe with reservation; changing field numbers always breaking), compatible type conversions (int32/uint32/int64/uint64/bool; sint32/sint64; string/bytes for UTF-8; enum/integer), oneof + map constraints, and buf-CLI's four-category breaking-change taxonomy (FILE, PACKAGE, WIRE_JSON, WIRE) with specific rule IDs. Use as the proto-evolution reference when designing schema changes or configuring buf breaking. Distinct from qa-contract-testing/protobuf-compat-checking which is the detection skill; this is the catalog of what is and isn't breaking and why."
rating: 23
d6: 4
---

# protobuf-versioning-strategy-reference

## Overview

Protobuf3 schema evolution is a wire-format problem first and a
codegen problem second. The field number is the only durable
identifier - every breaking-change rule derives from preserving
field-number → type binding.

Per [protobuf.dev/programming-guides/proto3/](https://protobuf.dev/programming-guides/proto3/):
"This number **cannot be changed once your message type is in
use** because it identifies the field in the message wire format."

This skill is a **pure reference** consumed by buf-CLI lint, the
breaking-build CI integration, and the gRPC service authors. For
the detection workflow see
[`buf-cli-lint-breaking-build`](../buf-cli-lint-breaking-build/SKILL.md).

## When to use

- Designing a proto change - is this safe?
- Auditing an existing schema for risky patterns (un-reserved
  deleted fields, oneof-conversion footguns).
- Configuring buf breaking - which category fits the deployment
  model?
- PR review of `.proto` changes.

## Field-number rules

Per
[protobuf.dev](https://protobuf.dev/programming-guides/proto3/):

| Range | Use |
|---|---|
| 1..15 | Single-byte encoded; **reserve for hot fields** (frequently set) |
| 16..2047 | Two-byte encoded; general use |
| 2048..536,870,911 | Higher-byte encoded; rare-use fields |
| 19,000..19,999 | **Reserved** for Protocol Buffers implementation; never use |

When deleting a field, **reserve its number**:

```proto
message User {
  reserved 4, 7, 10 to 12;
  reserved "deprecated_email";

  string name = 1;
  // ...
}
```

Per the spec: "If you do not reserve the field number, it is
possible for a developer to reuse that number in the future."
Reuse → semantic corruption: old clients interpret bytes as the
old type.

## Binary wire-safe changes

Per the protobuf3 docs, these are fully safe - old code parses
new messages and vice versa with no loss:

| Change | Why safe |
|---|---|
| Adding fields | Unknown fields preserved (proto3 since 3.5) |
| Removing fields **with reservation** | Number recycling prevented |
| Adding enum values | Unknown values pass through |
| Converting single explicit-presence field into a one-field oneof | Wire format identical |

## Wire-compatible changes (conditionally safe)

Per protobuf3 docs, these preserve wire compatibility but may be
lossy or surprising:

| Type change | Notes |
|---|---|
| `int32` ↔ `uint32` ↔ `int64` ↔ `uint64` ↔ `bool` | Integer types interchangeable; negative values may round-trip oddly for unsigned |
| `sint32` ↔ `sint64` | Compatible **only with each other**, not with the unsigned family |
| `fixed32` ↔ `sfixed32` | Same fixed-width family |
| `fixed64` ↔ `sfixed64` | Same fixed-width family |
| `string` ↔ `bytes` | Compatible **only if bytes are valid UTF-8** |
| `enum` ↔ `int32` / `uint32` / `int64` / `uint64` | Enum is wire-encoded as varint |

The catch: a parser reading `int64` data with `int32` will
silently truncate. The wire is "compatible" but the data may be
lost.

## Wire-incompatible changes (always breaking)

Per protobuf3 docs:

- **Changing field numbers** is equivalent to deleting and
  re-adding. Always breaks.
- **Moving fields into an existing oneof** is not safe.
- **Changing `map<k,v>` key or value type.**
- **Changing field cardinality** from `singular` to `repeated` (or
  vice versa) outside the wire-compatible paths.

## Oneof constraints

Per [protobuf.dev](https://protobuf.dev/programming-guides/proto3/):

- Oneof fields cannot be `repeated` or `map`.
- "If _multiple values are set, the last set value as determined
  by the order in the proto will overwrite all previous ones._"
- Adding a field to an existing oneof is **always breaking** - 
  old code can't represent the new variant; new data crashes old
  parsers.
- Removing a field from a oneof is breaking for the same reason.
- Converting a singular field **into** a single-field oneof: safe.
- Converting a single-field oneof **back** to singular: safe.

## Map constraints

Per protobuf3 docs:

- Maps cannot be `repeated`.
- Key types: integral and string scalars only. "neither enum nor
  proto messages are valid for `key_type`."
- Changing a map's key or value type is breaking.

## buf breaking-change taxonomy

Per [buf.build/docs/breaking/rules](https://buf.build/docs/breaking/rules),
buf organises detection into four categories, strictest to most
lenient:

### FILE (default)

Detects "changes that move generated code between files, breaking
generated source code on a per-file basis."

Selected rules:

| Rule | Detects |
|---|---|
| `ENUM_NO_DELETE` | Removed enum |
| `MESSAGE_NO_DELETE` | Removed message |
| `SERVICE_NO_DELETE` | Removed service |
| `FILE_NO_DELETE` | Removed file |
| `FIELD_SAME_NAME` | Renamed field |
| `FIELD_SAME_TYPE` | Type change |
| `FIELD_SAME_CARDINALITY` | singular ↔ repeated |

Choose FILE when **codegen consumers** import per-file (most
JVM, .NET, generated stubs in monorepo).

### PACKAGE

Detects breakage at package level; permits file relocations
inside a package.

Selected rules:

| Rule | Detects |
|---|---|
| `PACKAGE_NO_DELETE` | Removed package |
| `PACKAGE_ENUM_NO_DELETE` | Enum deletion across files in package |
| `PACKAGE_MESSAGE_NO_DELETE` | Message deletion across files |

Choose PACKAGE when consumers import by package (Go, Python).

### WIRE_JSON

Detects "changes that break wire (binary) or JSON encoding."

Selected rules:

| Rule | Detects |
|---|---|
| `ENUM_VALUE_NO_DELETE_UNLESS_NUMBER_RESERVED` | Deleted enum value without reserve |
| `FIELD_NO_DELETE_UNLESS_NUMBER_RESERVED` | Deleted field without reserve |
| `FIELD_SAME_JSON_NAME` | JSON field name change |

Choose WIRE_JSON when consumers use both binary and JSON encoding
(REST gateway + grpc).

### WIRE (most lenient)

Detects only changes "compromising binary wire format
compatibility."

Selected rules:

| Rule | Detects |
|---|---|
| `FIELD_WIRE_COMPATIBLE_TYPE` | Type change incompatible at wire level (allows int32→int64 etc.) |
| `FIELD_WIRE_COMPATIBLE_CARDINALITY` | Cardinality change incompatible at wire |

Choose WIRE when only wire format matters (binary-only protocols
between server fleets you control).

### Choosing the category

```yaml
# buf.yaml
version: v2
breaking:
  use:
    - FILE        # most strict (default)
# OR
    - PACKAGE     # codegen friendly within-package
# OR
    - WIRE_JSON   # wire + JSON
# OR
    - WIRE        # wire only
```

CI invocation:

```bash
buf breaking --against ".git#branch=main"
# Compares the working tree against the main branch as baseline
```

## Common patterns

### Adding an optional field

Safe (always):

```diff
 message User {
   string name = 1;
+  string nickname = 2;
 }
```

### Removing a field

Always reserve:

```diff
 message User {
+  reserved 2;
+  reserved "nickname";
   string name = 1;
-  string nickname = 2;
 }
```

### Renaming a field

Add new, deprecate + reserve old:

```diff
 message User {
   string name = 1;
-  string nickname = 2;
+  string display_name = 3;
+  reserved 2;
+  reserved "nickname";
 }
```

Consumers must migrate from `nickname` to `display_name`. The wire
format reads either; the codegen forces consumers to update.

### Promoting `int32` to `int64`

Wire-compatible per protobuf3 docs:

```diff
 message Counter {
-  int32 count = 1;
+  int64 count = 1;
 }
```

Old clients writing int32 still parse correctly. Old clients
reading new int64 data **truncate silently** if the value exceeds
int32 range.

### Adding a field to a oneof

**ALWAYS BREAKING.** Don't.

```diff
 message Event {
   oneof body {
     string text = 1;
     bytes binary = 2;
+    string emoji = 3;  // BREAKS old parsers
   }
 }
```

Mitigation: add the new variant as a **non-oneof** field; promote
later in a separate proto file/package.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Delete field without reserve | Future developer reuses number; semantic corruption | Always `reserved <n>;` and `reserved "name";` |
| Change field number to be more compact | Wire incompatibility - equivalent to delete+re-add | Never; keep numbers stable |
| Add field to existing oneof | Old parsers crash on unknown variant | Add outside the oneof; integrate later via wrapper |
| Rename without deprecating | Codegen consumers break at compile time | Add new field, reserve old name |
| Use enum value 0 for `UNKNOWN` and re-purpose | Hidden meaning change | Reserve enum value 0 explicitly for `UNSPECIFIED` |
| Treat string ↔ bytes as always safe | UTF-8 invariant required | Verify the data is UTF-8 valid first |
| Skip buf breaking on PR | Manual review misses subtle breakage | `buf breaking --against main` in CI |
| Use WIRE category for codegen consumers | Generated code breaks on field rename even if wire OK | Use FILE / PACKAGE |
| One global proto file | All consumers locked to single evolution path | Per-bounded-context proto files |

## Limitations

- **buf categories cover binary breakage.** Semantic breakage (a
  field's *meaning* changes) is not detectable. Document semantic
  changes in commit messages.
- **JSON name changes** (camelCase ↔ snake_case) detected only
  in WIRE_JSON.
- **No transitive analysis.** A message field whose type is an
  imported message: buf doesn't follow the import.
- **Doesn't enforce naming conventions.** `buf lint` is separate
  from `buf breaking`.

## References

- protobuf3 versioning rules:
  [protobuf.dev/programming-guides/proto3/](https://protobuf.dev/programming-guides/proto3/).
- buf breaking-change rules:
  [buf.build/docs/breaking/rules](https://buf.build/docs/breaking/rules).
- Consumed by:
  [`buf-cli-lint-breaking-build`](../buf-cli-lint-breaking-build/SKILL.md),
  [`grpc-streaming-test-author`](../grpc-streaming-test-author/SKILL.md).
- Differentiation: this is the **catalog of what is and isn't
  breaking and why**. For detection of changes in CI, use
  [`buf-cli-lint-breaking-build`](../buf-cli-lint-breaking-build/SKILL.md).
  For protobuf-schema contract-testing across services see
  [`qa-contract-testing/protobuf-compat-checking`](../../../qa-contract-testing/skills/protobuf-compat-checking/SKILL.md).
