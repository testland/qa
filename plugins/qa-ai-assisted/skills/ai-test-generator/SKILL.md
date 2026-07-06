---
name: ai-test-generator
description: "Build-an-X workflow that uses an LLM to generate tests from natural-language specs (acceptance criteria, user stories) - outputs tests with confidence scoring per case (LLM's own self-assessment + heuristics: assertion-quality, naming, completeness), batches uncertain cases for human review, integrates with the team's existing test framework. Critical: AI-generated tests are unreliable without curation; pairs with `ai-test-curator` (the adversarial reviewer). Use when a team has many AC to convert and wants AI-augmentation, not AI-replacement."
---

# ai-test-generator

## Overview

LLMs can generate test code from natural-language specs. They're
fast - turn 10 ACs into 10 test stubs in seconds. They're also
unreliable: hallucinated APIs, weak assertions
(`expect(x).toBeTruthy()`), missed edge cases, plausible-but-wrong
implementations.

This skill provides the **augmentation framework**: AI generates,
the team curates. Per [`ai-test-curator`](../../agents/ai-test-curator.md),
generated tests are reviewed adversarially before merge.

## When to use

- The team has 20+ ACs to convert into tests; manual authoring is
  slow.
- A spec-driven test suite is needed and the team accepts the
  curate-after-generate workflow.
- AI test generation is part of the team's "augmentation"
  strategy, not "replacement."

If the team treats AI output as production-ready without review,
**do not use this skill**. AI test code without curation produces
the worst-of-both-worlds: tests exist (false confidence) but
verify the wrong things or nothing.

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

The structured input is critical - vague natural-language input
produces hallucinated tests. Concrete inputs/expected outputs
constrain the LLM.

## Step 2 - Run the generator

```bash
# scripts/ai-gen.py
import openai

system_prompt = """
You generate tests in {framework} for the given AC spec.
Constraints:
- One test per AC.
- Use the project's test code conventions (see test-code-conventions reference).
- Specific assertions only - no .toBeTruthy() / .toBeDefined() style.
- Use {test_runner}'s standard primitives.
- If you can't satisfy an AC with the given inputs, mark with
  CONFIDENCE: low and explain why.
"""

for ac in input_yaml['acceptance_criteria']:
    response = openai.chat.completions.create(
        model='gpt-4',
        messages=[
            {'role': 'system', 'content': system_prompt.format(...)},
            {'role': 'user', 'content': format_ac_prompt(ac)},
        ],
    )
    save_test(ac['id'], response.choices[0].message.content)
```

## Step 3 - Confidence scoring

Per generated test, compute a confidence score:

```python
def score(test_code, ac):
    score = 100

    # LLM's own confidence (parsed from output)
    if 'CONFIDENCE: low' in test_code:
        score -= 40

    # Vague matchers
    weak_matchers = ['.toBeTruthy()', '.toBeDefined()', '.toBeFalsy()', '.toContain(']
    score -= sum(20 for m in weak_matchers if m in test_code)

    # Hallucinated APIs (heuristic: imports that don't exist)
    for imp in extract_imports(test_code):
        if not module_exists(imp):
            score -= 30

    # Naming
    test_name = extract_test_name(test_code)
    if any(generic in test_name.lower() for generic in ['works', 'should', 'test 1', 'placeholder']):
        score -= 15

    return max(0, score)
```

| Score      | Action                                              |
|------------|-----------------------------------------------------|
| 80-100     | High-confidence - review can be quick.               |
| 50-79      | Medium - careful review required.                    |
| <50         | Low - likely needs rewrite or rejection.             |

## Step 4 - Output structure

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

Per [`ai-test-curator`](../../agents/ai-test-curator.md), review
each generated test for:
- Hallucinated APIs / functions / constants
- Weak assertions (per [`assertion-quality-reviewer`](../../qa-test-review/agents/assertion-quality-reviewer.md))
- Missing setup / teardown
- Redundancy with existing tests

After curation: merge.
```

## Step 5 - Iteration loop

```
Spec → Generate → Score → Review → (rewrite | merge | reject)
                                       ↓
                                   Lessons fed back into prompt
```

The team's prompt evolves: when the LLM keeps producing
`.toBeTruthy()`, add an explicit prohibition. When it hallucinates
an API, add an example of the real API.

## Step 6 - Cost + rate management

LLM calls have cost and rate limits. Pattern:

- Generate per-PR: only new ACs.
- Cache prior generations: if AC unchanged, reuse the previous
  test.
- Batch: generate 5-10 ACs per LLM call to amortize overhead.
- Budget: cap monthly generation cost; track per-team.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Treating AI output as production-ready                                | Hallucinations + weak assertions ship; false confidence.                 | Always curate (Step 4 hand-off). |
| Vague spec input ("Apply a promo")                                     | LLM fills in details; hallucinations.                                    | Structured input with concrete inputs/expected (Step 1). |
| Skipping confidence scoring                                            | All tests treated equally; high-priority review gets diluted.            | Tier by confidence (Step 3). |
| Using generic LLM without project context                             | LLM doesn't know the team's test conventions; outputs idiomatic-but-wrong code. | Inject conventions into the prompt. |
| One-shot generation without iteration                                  | Prompt isn't refined; quality plateaus.                                  | Lessons-feedback loop (Step 5). |

## Limitations

- **LLM quality varies.** GPT-4 / Claude / Gemini differ;
  per-team experimentation needed.
- **Hallucinated APIs are a constant risk.** Even with examples,
  the LLM may invent `cart.applyDiscount()` when the real method
  is `cart.applyPromo()`. Curator catches.
- **Cost.** Per-AC generation costs add up at scale.
- **Confidence scoring is heuristic.** A high-confidence test can
  still be wrong; never skip review.

## References

- [`ai-test-curator`](../../agents/ai-test-curator.md) - required
  downstream review.
- [`ai-spec-coverage-mapper`](../ai-spec-coverage-mapper/SKILL.md) - sister: maps existing tests to spec sections.
- [`acceptance-test-from-criteria`](../../../qa-bdd/skills/acceptance-test-from-criteria/SKILL.md) - non-AI alternative for AC-to-test conversion.
- [`assertion-quality-reviewer`](../../../qa-test-review/agents/assertion-quality-reviewer.md) - runs alongside curator on generated tests.
