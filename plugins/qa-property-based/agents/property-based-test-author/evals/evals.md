---
component: property-based-test-author
type: agent
archetype: A2
---

# property-based-test-author — evals

Companion eval cases for [`property-based-test-author`](../../property-based-test-author.md).

## Eval 1: happy path — Hypothesis roundtrip property in Python

**Input:**
- Tool override: `Hypothesis`.
- Target function: `serialize(data: dict) -> str` and `deserialize(s: str) -> dict` in `src/codec.py`.
- Stated invariant: "Roundtrip — `deserialize(serialize(d)) == d` for all valid dict `d`."
- Project has `pyproject.toml` with `[tool.pytest.ini_options]`.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Emits one Python test file at `tests/test_codec_property.py` containing:
- `from hypothesis import given, strategies as st`
- `@given(st.dictionaries(keys=st.text(), values=st.integers()))`  
  (or a richer strategy if dict values are more constrained)
- `def test_roundtrip(d): assert deserialize(serialize(d)) == d`
- No `@settings(max_examples=5)` short-circuit

**Pass condition:** Output contains the literal substrings `from hypothesis import` AND `@given` AND `deserialize(serialize` AND `== d` and does NOT contain `max_examples=5` OR `max_examples=10`.

## Eval 2: branch — fast-check idempotence property in TypeScript

**Input:**
- Tool override: `fast-check`.
- Target function: `normalize(s: string): string` in `src/text.ts`.
- Stated invariant: "Idempotence — `normalize(normalize(s)) === normalize(s)` for all string `s`."
- Project has `package.json` with `"fast-check"` in devDependencies.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Emits one TS test file at `tests/text.property.test.ts` containing:
- `import fc from 'fast-check'`
- `test('normalize is idempotent', () => { fc.assert(fc.property(fc.string(), s => normalize(normalize(s)) === normalize(s))); });`
- Uses `fc.string()` arbitrary (not a manual list of strings)

**Pass condition:** Output contains the literal substrings `import fc from 'fast-check'` AND `fc.property(fc.string()` AND `normalize(normalize(s))` AND `=== normalize(s)`.

## Eval 3: adversarial — "test with random inputs" without an invariant

**Input:**
- Target function: `processOrder(o: Order)` in `src/orders.ts`.
- "Invariant" provided by user: "Just call it with random orders and make sure it doesn't throw."

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to author a property test. Explains that "doesn't throw" is satisfied by random/fuzz testing, not property-based testing — property-based testing earns its keep when there's a meaningful invariant (roundtrip / idempotence / conservation / monotonicity / commutativity / inverse / reference). Recommends:
- `qa-unit-tests-js/js-test-author` if there's a specific expected behavior per input,
- `qa-fuzz-testing` if the goal is "crash on adversarial inputs."

Does NOT emit a property test.

**Pass condition:** Output contains the literal substring `invariant` AND (`qa-fuzz-testing` OR `qa-unit-tests`) AND does NOT contain `fc.assert` OR `@given` OR `@Property` OR `proptest!`.

## Notes

- Eval file lives outside the lint glob — no rating frontmatter needed.
- Pass conditions are literal-string checks.
- Target-model dates are eval-authoring dates (2026-05-25).
