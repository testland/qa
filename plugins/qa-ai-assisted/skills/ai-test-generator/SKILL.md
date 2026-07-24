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

```bash
# scripts/ai-gen.py
import openai
import os

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

def format_ac_prompt(ac):
    """Format a single AC dict into a prompt string for the LLM."""
    return (
        f"AC ID: {ac['id']}\n"
        f"Description: {ac['description']}\n"
        f"Inputs: {ac['inputs']}\n"
        f"Expected: {ac['expected']}"
    )

def save_test(ac_id, test_code, output_dir='tests/generated'):
    """Write generated test code to tests/generated/<ac_id>.test.js (or .py)."""
    os.makedirs(output_dir, exist_ok=True)
    # Detect language from shebang or content; default to .js
    ext = '.py' if test_code.lstrip().startswith('def ') or 'import pytest' in test_code else '.js'
    path = os.path.join(output_dir, f"{ac_id.replace('-', '_').lower()}{ext}")
    with open(path, 'w') as f:
        f.write(test_code)
    return path

for ac in input_yaml['acceptance_criteria']:
    response = openai.chat.completions.create(
        model='gpt-4',
        messages=[
            {'role': 'system', 'content': system_prompt.format(
                framework='jest',       # replace with team's framework
                test_runner='jest',     # replace with team's test runner
            )},
            {'role': 'user', 'content': format_ac_prompt(ac)},
        ],
    )
    save_test(ac['id'], response.choices[0].message.content)
```

The `test-code-conventions` reference in the system prompt should be a project-specific file (e.g. `docs/test-code-conventions.md`) injected into the prompt at runtime.

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

Per generated test, compute a confidence score:

```python
import importlib.util
import ast
import re

def extract_imports(test_code: str) -> list[str]:
    """Return a list of top-level module names imported in the code."""
    try:
        tree = ast.parse(test_code)
    except SyntaxError:
        return []
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend(alias.name.split('.')[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.append(node.module.split('.')[0])
    return imports

def module_exists(module_name: str) -> bool:
    """Return True if the module can be found in the current environment."""
    return importlib.util.find_spec(module_name) is not None

def extract_test_name(test_code: str) -> str:
    """Return the first test/it/def test_ name found in the code."""
    match = re.search(r'(?:it|test|def test_)\s*\(?["\']?([^"\'(),]+)', test_code)
    return match.group(1) if match else ''

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

| Anti-pattern                                                          | Fix |
|-----------------------------------------------------------------------|-----|
| Treating AI output as production-ready                                | Always curate (Step 5 hand-off). |
| Vague spec input ("Apply a promo")                                     | Structured input with concrete inputs/expected (Step 1). |
| Skipping compilation validation                                        | Run compile check (Step 3) before scoring. |
| Skipping confidence scoring                                            | Tier by confidence (Step 4). |
| Using generic LLM without project context                             | Inject conventions into the prompt. |
| One-shot generation without iteration                                  | Lessons-feedback loop (Step 6). |

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
