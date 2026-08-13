# buf breaking-rule tables and worked evolution patterns

Full rule-ID tables for buf's four breaking categories, plus worked
proto-evolution diffs. Sources:
[buf.build/docs/breaking/rules](https://buf.build/docs/breaking/rules)
and [protobuf.dev/programming-guides/proto3/](https://protobuf.dev/programming-guides/proto3/).

## FILE (default)

| Rule | Detects |
|---|---|
| `ENUM_NO_DELETE` | Removed enum |
| `MESSAGE_NO_DELETE` | Removed message |
| `SERVICE_NO_DELETE` | Removed service |
| `FILE_NO_DELETE` | Removed file |
| `FIELD_SAME_NAME` | Renamed field |
| `FIELD_SAME_TYPE` | Type change |
| `FIELD_SAME_CARDINALITY` | singular <-> repeated |

## PACKAGE

| Rule | Detects |
|---|---|
| `PACKAGE_NO_DELETE` | Removed package |
| `PACKAGE_ENUM_NO_DELETE` | Enum deletion across files in package |
| `PACKAGE_MESSAGE_NO_DELETE` | Message deletion across files |

## WIRE_JSON

| Rule | Detects |
|---|---|
| `ENUM_VALUE_NO_DELETE_UNLESS_NUMBER_RESERVED` | Deleted enum value without reserve |
| `FIELD_NO_DELETE_UNLESS_NUMBER_RESERVED` | Deleted field without reserve |
| `FIELD_SAME_JSON_NAME` | JSON field name change |

## WIRE (most lenient)

| Rule | Detects |
|---|---|
| `FIELD_WIRE_COMPATIBLE_TYPE` | Type change incompatible at wire level (allows int32->int64 etc.) |
| `FIELD_WIRE_COMPATIBLE_CARDINALITY` | Cardinality change incompatible at wire |

## Worked evolution patterns

### Adding an optional field

Safe (always):

```diff
 message User {
   string name = 1;
+  string nickname = 2;
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

Consumers must migrate from `nickname` to `display_name`. The wire format reads
either; the codegen forces consumers to update.

### Promoting `int32` to `int64`

Wire-compatible per protobuf3 docs:

```diff
 message Counter {
-  int32 count = 1;
+  int64 count = 1;
 }
```

Old clients writing int32 still parse correctly. Old clients reading new int64
data truncate silently if the value exceeds int32 range.

### Adding a field to a oneof

ALWAYS BREAKING. Don't.

```diff
 message Event {
   oneof body {
     string text = 1;
     bytes binary = 2;
+    string emoji = 3;  // BREAKS old parsers
   }
 }
```

Mitigation: add the new variant as a non-oneof field; promote later in a separate
proto file/package.
