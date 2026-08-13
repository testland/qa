---
name: ai-spec-coverage-mapper
description: "Build-an-X workflow that uses an LLM to map existing tests to spec sections - given a spec doc + the test suite, the LLM identifies which tests cover which sections, surfaces uncovered sections (gap), and recommends specific tests to add. Output is a coverage matrix per spec ID. Scope is mapping tests that already exist and naming the gaps, not authoring tests for new acceptance criteria. Use when a spec doc and a test suite both exist but nobody can say which requirements are actually covered - before a release sign-off, an audit, or a decision about where to spend the next round of test effort."
---

# ai-spec-coverage-mapper

## Overview

Coverage tools (per `lcov-analysis` in the qa-test-reporting plugin)
report which **lines** are tested. They don't report which **spec
sections** are tested.

A spec section like "AC-1.4: Already-applied promo shows 'Already
applied'" might be:

- Covered by a test (good).
- Partially covered (the AC says "Already applied"; the test
  asserts "Already used" - semantic drift).
- Not covered.

This skill uses an LLM to map tests to spec sections semantically -
the mapping human coverage tools cannot produce.

## When to use

- The team has a spec doc + a test suite and wants spec-coverage
  visibility.
- Before a release sign-off - to answer "which requirements are
  actually covered?"
- An audit / compliance review needs spec-test traceability.
- After AC drift - tests written months ago for ACs that have
  since changed.

Scope is mapping tests that **already exist** and naming the gaps -
not authoring tests for the gaps (that is `ai-test-generator`).

## How to use

1. Point the mapper at the spec doc + the test globs, and set the
   AC-ID extraction pattern.
2. Run the LLM mapper - it reads the spec and the tests and emits, per
   AC ID, a coverage tier (`full` / `partial` / `none`) plus the
   covering test names.
3. Read the coverage matrix - every `partial` and `none` row is a gap.
4. File one action item per gap (fix the drift, or add the missing
   test).
5. Schedule it weekly and verify the LLM's claims - see
   [references/continuous-coverage-and-verification.md](references/continuous-coverage-and-verification.md).

## Worked example - checkout promo spec

**Inputs.** Point the mapper at the spec and the tests, and declare
how AC IDs are written in the spec:

```yaml
spec_path: "docs/specs/checkout.md"
test_globs:
  - "tests/checkout/**/*.spec.ts"
  - "features/checkout/*.feature"
ac_extraction:
  pattern: "AC-(\\d+\\.\\d+):"   # AC IDs in the spec
```

**Run the mapper.** The LLM reads both the spec and the tests and
classifies each AC:

```python
# scripts/ai-coverage.py
import openai

spec_text = read(spec_path)
ac_list = extract_acs(spec_text)
test_files = read_all(test_globs)

system_prompt = """
You map AC IDs to tests. For each AC ID, identify:
- which test files cover it
- which test names within those files cover it
- coverage tier: full | partial | none

If partial, explain what aspect is missing.
"""

response = openai.chat.completions.create(
    model='gpt-4',
    messages=[
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': f"Spec:\n{spec_text}\n\nTests:\n{test_files}"},
    ],
)
print(response.choices[0].message.content)
```

**Output.** A coverage matrix per AC, the action items, and a trend
vs. the prior run:

```markdown
## Spec -> test coverage map

**Spec:** `docs/specs/checkout.md`
**ACs:** 12
**Tests inventoried:** 47

### Coverage matrix

| AC ID    | Description                              | Coverage | Tests                                               |
|----------|------------------------------------------|----------|-----------------------------------------------------|
| AC-1.1    | Valid promo applies discount               |   ✅ full | `promo.spec.ts > "applies WELCOME10"`              |
| AC-1.2    | Expired promo shows error                   |   ✅ full | `promo.spec.ts > "shows error for EXPIRED50"`      |
| AC-1.3    | Invalid format shows "Code not found"        |   ✅ full | `promo.spec.ts > "rejects NOTREAL"`                  |
| AC-1.4    | Already-applied promo shows "Already applied" |   ⚠ partial | `promo.spec.ts > "rejects duplicate"`. ⚠ Test asserts "Already used" - message drift from AC. |
| AC-1.5    | Promo applies before tax                    |   ❌ none |                                                       |
| AC-2.1    | Stripe webhook delivery retried              |   ✅ full | `webhook.spec.ts > "retries on 500"`               |
| AC-2.2    | Stripe webhook delivery DLQ after 3 fails    |   ❌ none |                                                       |
| ...

### Action items

| AC ID   | Action                                          |
|---------|-------------------------------------------------|
| AC-1.4   | Update test message assertion to match AC ("Already applied"). |
| AC-1.5   | Add test asserting promo applies before tax.    |
| AC-2.2   | Add test for DLQ-after-3-fails behavior.        |

### Coverage trend

(Compare with prior run)
- AC count: 12 (was 10)
- Full coverage: 9/12 = 75% (was 8/10 = 80%)
- 2 new ACs added in this PR; both uncovered.
```

Each `partial` / `none` row becomes one action item; the two new
uncovered ACs are the highest-priority gaps to close before sign-off.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Trusting LLM's "full coverage" claim without verification             | Hallucination; tests don't actually cover the AC.                       | Spot-check + cross-reference every high-priority AC (see references). |
| Running on the entire codebase repeatedly                             | Cost + slow.                                                              | Filter to changed ACs / tests since last run. |
| One-shot mapping; never updated                                       | Drift; mapping stale.                                                    | Schedule weekly (see references). |
| No action items per gap                                                | Coverage gaps surface but nothing happens.                                | One action item per gap (see the worked example). |

## Limitations

- **LLM quality varies.** Same caveats as
  `ai-test-generator`.
- **Spec format matters.** Well-structured ACs (numbered, clearly
  scoped) map cleanly; vague specs produce vague mappings.
- **No code-execution verification.** The LLM reads code; doesn't
  run it. A test that imports correctly but throws at runtime
  may be classified "covered."
- **Test naming influences mapping quality.** Per-test names like
  "test_1" don't help the LLM identify what's covered.

## References

- [references/continuous-coverage-and-verification.md](references/continuous-coverage-and-verification.md) -
  weekly CI scheduling and how to verify the LLM's coverage claims.
- `ai-test-generator` - sister
  skill: generates tests for the gaps this skill identifies.
- `gherkin-from-stories` (in the qa-bdd plugin, ATDD mode) - for tag-based AC traceability without LLM.
- `test-coverage-targeter` (in the qa-test-reporting plugin) - its coverage debt ledger tracks line-coverage debt; complementary to spec coverage.
