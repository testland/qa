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

This skill uses an LLM to map tests ↔ spec sections semantically.

## When to use

- The team has a spec doc + a test suite and wants spec-coverage
  visibility.
- An audit / compliance review needs spec-test traceability.
- After AC drift - tests written months ago for ACs that have
  since changed.

## Step 1 - Inputs

```yaml
spec_path: "docs/specs/checkout.md"
test_globs:
  - "tests/checkout/**/*.spec.ts"
  - "features/checkout/*.feature"
ac_extraction:
  pattern: "AC-(\\d+\\.\\d+):"   # AC IDs in the spec
```

The LLM reads both the spec and the tests; outputs the mapping.

## Step 2 - Run the mapper

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

## Step 3 - Output

```markdown
## Spec → test coverage map

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

## Step 4 - Continuous use

Schedule weekly:

```yaml
on:
  schedule:
    - cron: '0 4 * * MON'

jobs:
  spec-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: python scripts/ai-coverage.py
      - uses: peter-evans/create-issue-from-file@v5
        with:
          title: 'Spec coverage report - week of ${{ github.event.repository.updated_at }}'
          content-filepath: spec-coverage-report.md
```

## Step 5 - Confidence + LLM hallucination

LLMs may claim a test "covers" an AC when it doesn't. Verification:

- Spot-check the highest-priority ACs manually.
- Cross-reference with `acceptance-test-from-criteria` (in the qa-bdd plugin)
  if the team uses `@AC-X.Y` tags - those are the ground truth.
- Compare LLM's claim vs. test code via human review.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Trusting LLM's "full coverage" claim without verification             | Hallucination; tests don't actually cover the AC.                       | Spot-check + cross-reference (Step 5). |
| Running on the entire codebase repeatedly                             | Cost + slow.                                                              | Filter to changed ACs / tests since last run. |
| One-shot mapping; never updated                                       | Drift; mapping stale.                                                    | Weekly cadence (Step 4). |
| No action items per gap                                                | Coverage gaps surface but nothing happens.                                | Per-gap action item (Step 3 example). |

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

- `ai-test-generator` - sister
  skill: generates tests for the gaps this skill identifies.
- `acceptance-test-from-criteria` (in the qa-bdd plugin) - for tag-based AC traceability without LLM.
- `coverage-debt-tracker` (in the qa-test-impact-analysis plugin) - line-coverage debt; complementary to spec coverage.
