---
component: property-based-tool-selector
type: agent
---

# property-based-tool-selector - evals

Companion eval cases for [`property-based-tool-selector`](../../property-based-tool-selector.md).

## Eval 1: happy path - Python project

**Input:**
- Project root contains `pyproject.toml` with `[tool.pytest.ini_options]` and a `tests/` directory.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Recommends **Hypothesis** as the primary tool. Rationale: canonical Python property-based library, integrates with pytest. Read next: `hypothesis-testing`.

**Pass condition:** Output contains the literal substrings `Hypothesis` AND `hypothesis-testing` AND (`python` OR `Python` OR `pytest`) and does NOT recommend fast-check / jqwik / proptest / QuickCheck.

## Eval 2: branch - Rust project

**Input:**
- Project root contains `Cargo.toml` with `[package]` block + `src/lib.rs`.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Recommends **proptest** as the primary tool. Rationale: Rust property-based testing inspired by Hypothesis. Read next: `proptest-testing`.

**Pass condition:** Output contains the literal substrings `proptest` AND `proptest-testing` AND (`rust` OR `Rust` OR `Cargo`) and does NOT recommend other tools.

## Eval 3: adversarial - request for non-property "random testing"

**Input:**
- Project root contains `package.json` with TypeScript.
- Behavior spec: "I want to call the function with 10000 random integers and check it doesn't crash."

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to set up property-based testing for this. Explains that property-based testing earns its keep when there's a meaningful invariant (roundtrip, idempotence, conservation, monotonicity) - random-input-doesn't-crash is satisfied by parameterized unit tests + the language's fuzzing tooling. Recommends qa-unit-tests-js + qa-fuzz-testing instead. Does NOT recommend fast-check.

**Pass condition:** Output contains the literal substring `invariant` OR (`property-based` AND (`refuse` OR `not suited`)) AND (`fuzz` OR `parameterized` OR `qa-unit-tests`) and does NOT contain "Recommended tool: fast-check" as the primary.

## Notes

- Eval file lives outside the lint glob - no rating frontmatter needed.
- Pass conditions are literal-string checks.
- Target-model dates are eval-authoring dates (2026-05-25).
