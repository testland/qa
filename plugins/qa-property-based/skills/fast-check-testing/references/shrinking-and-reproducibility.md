# fast-check shrinking and reproducibility

When a property fails, fast-check prints the falsifying input + a
shrunk minimal version + a seed:

```
Property failed after 47 tests
{ seed: 1234567890, path: "12:1:0", endOnFailure: true }
Counterexample: [{"id": "abc", "age": -1}]
Shrunk 8 time(s)
Got error: Expected age to be >= 18, got -1
```

To reproduce, replay with the seed:

```typescript
fc.assert(
  fc.property(...),
  { seed: 1234567890, path: "12:1:0", endOnFailure: true }
);
```

The seed/path is the deterministic recipe to re-derive the failure.

For CI, set a fixed seed:

```typescript
import fc from 'fast-check';
fc.configureGlobal({ seed: process.env.CI ? 42 : Date.now() });
```
