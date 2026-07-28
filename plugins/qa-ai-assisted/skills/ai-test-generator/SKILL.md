---
name: ai-test-generator
description: "Generates tests from natural-language specs (acceptance criteria, user stories, requirements) using an LLM, with confidence scoring per test case (LLM self-assessment plus heuristics: assertion quality, naming, completeness), batching uncertain cases for human review, and integration with the team's existing test framework. Use when the user asks to generate unit tests from acceptance criteria, convert user stories to test cases, automate test creation from requirements, or augment a spec-driven test suite with AI-generated stubs that are then curated before merge."
---

# ai-test-generator

## Overview

This skill provides an **augmentation framework** for converting acceptance criteria (ACs) into test code: AI generates, the team curates. Generated tests are scored for confidence and reviewed adversarially before merge.

## Step 1 - Define the input

```yaml
# input/cart-promo.yaml
spec_source: "stories/LIN-1234.md"
acceptance_criteria:
  - id: AC-1.1
    description: "Valid promo 'WELCOME10' reduces subtotal by 10%"
    inputs:
      cart_total: 24.99
      promo_code: "WELCOME10"
    expected:
      subtotal_after: 22.49
      message: "Code applied"

  - id: AC-1.2
    description: "Expired promo shows error 'This code has expired'"
    inputs:
      cart_total: 24.99
      promo_code: "EXPIRED50"
    expected:
      subtotal_after: 24.99
      error: "This code has expired"
```

## Step 2 - Run the generator

Generate one test per AC. Core loop below; full script with helpers and the
project-conventions injection is in
[references/generation-and-scoring.md](references/generation-and-scoring.md).

```python
# scripts/ai-gen.py
import openai

system = ("Generate one test per AC in {framework} using the project's test "
          "conventions (inject docs/test-code-conventions.md). Specific "
          "assertions only - no .toBeTruthy() / .toBeDefined(). If an AC can't "
          "be satisfied with the given inputs, mark CONFIDENCE: low and say why.")

for ac in input_yaml['acceptance_criteria']:
    response = openai.chat.completions.create(
        model='gpt-4',
        messages=[
            {'role': 'system', 'content': system.format(framework='jest')},
            {'role': 'user', 'content': f"{ac['id']}: {ac['description']} | "
                                        f"inputs {ac['inputs']} -> {ac['expected']}"},
        ],
    )
    open(f"tests/generated/{ac['id']}.test.js", 'w').write(
        response.choices[0].message.content)
```

## Step 3 - Validate before scoring

Before scoring, verify that generated test files parse and compile. Failing tests caught here should be flagged as `CONFIDENCE: low` automatically.

```bash
# For TypeScript projects
npx tsc --noEmit

# For Python projects
python -m py_compile path/to/generated_test.py

# For JavaScript projects (syntax check)
node --check path/to/generated_test.js
```

Any file that fails compilation is immediately downgraded: subtract 50 from its score before applying the heuristics in Step 4.

## Step 4 - Confidence scoring

Per generated test, compute a confidence score. The rubric is the core of the
skill; its parsing helpers (`extract_imports`, `module_exists`,
`extract_test_name`) are in
[references/generation-and-scoring.md](references/generation-and-scoring.md).

```python
def score(test_code, ac):
    score = 100
    if 'CONFIDENCE: low' in test_code:                 # LLM's own confidence
        score -= 40
    weak = ['.toBeTruthy()', '.toBeDefined()', '.toBeFalsy()', '.toContain(']
    score -= sum(20 for m in weak if m in test_code)   # vague matchers
    for imp in extract_imports(test_code):             # hallucinated imports
        if not module_exists(imp):
            score -= 30
    name = extract_test_name(test_code).lower()        # generic naming
    if any(g in name for g in ['works', 'should', 'test 1', 'placeholder']):
        score -= 15
    return max(0, score)
```

| Score      | Action                                              |
|------------|-----------------------------------------------------|
| 80-100     | High-confidence - review can be quick.               |
| 50-79      | Medium - careful review required.                    |
| <50         | Low - likely needs rewrite or rejection.             |

## Step 5 - Output structure

```markdown
## AI-generated tests - `<spec>`

**Generated:** N tests
**High-confidence:** M (review: spot-check 2-3)
**Medium-confidence:** K (review each)
**Low-confidence:** L (likely rewrite)

### High-confidence (4)

(test code blocks with confidence scores)

### Medium-confidence (3)

(blocks with confidence scores + flagged issues)

### Low-confidence (2)

(blocks with confidence scores + recommend manual rewrite)

### Hand-off

Review each generated test for:
- Hallucinated APIs / functions / constants
- Weak assertions (assert on specific expected values, not just truthiness)
- Missing setup / teardown
- Redundancy with existing tests

After curation: merge.
```

## Step 6 - Iteration loop

```
Spec → Generate → Validate → Score → Review → (rewrite | merge | reject)
                                                    ↓
                                        Lessons fed back into prompt
```

The team's prompt evolves: when the LLM keeps producing
`.toBeTruthy()`, add an explicit prohibition. When it hallucinates
an API, add an example of the real API.

## Step 7 - Cost + rate management

LLM calls have cost and rate limits. Pattern:

- Generate per-PR: only new ACs.
- Cache prior generations: if AC unchanged, reuse the previous
  test.
- Batch: generate 5-10 ACs per LLM call to amortize overhead.
- Budget: cap monthly generation cost; track per-team.

## Anti-patterns

- Treating AI output as production-ready -> always curate (Step 5 hand-off).
- Vague spec input ("Apply a promo") -> structured inputs/expected (Step 1).
- Skipping compilation validation -> run the compile check (Step 3) before scoring.
- Skipping confidence scoring -> tier by confidence (Step 4).
- Generic LLM without project context -> inject conventions into the prompt (Step 2).
- One-shot generation -> keep the lessons-feedback loop (Step 6).

## Limitations

- **Hallucinated APIs are a constant risk.** Even with examples,
  the LLM may invent `cart.applyDiscount()` when the real method
  is `cart.applyPromo()`. Review catches this.
- **Cost.** Per-AC generation costs add up at scale.
- **Confidence scoring is heuristic.** A high-confidence test can
  still be wrong; never skip review.

## References

- `ai-spec-coverage-mapper` - sister skill: maps existing tests to spec sections.
- `acceptance-test-from-criteria` (in the qa-bdd plugin) - non-AI alternative for AC-to-test conversion.
