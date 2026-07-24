---
name: llm-regression-suite-author
description: "Builds a versioned golden-dataset LLM regression suite for tracking quality across model upgrades: structures a versioned JSONL/CSV golden dataset, configures deterministic eval runs (temperature 0, seed), wires assertion layers (exact, semantic similarity, LLM-as-judge, rubric), enforces a pass-rate threshold with diff reporting vs the baseline model, and gates CI on regression. Use when upgrading an LLM provider model and needing a repeatable before/after quality gate, or when a prompt regression suite must track output quality across model versions over time."
metadata:
  keywords: "llm-regression, golden-dataset, model-upgrade, promptfoo, deepeval, pass-rate, deterministic-eval"
---

# llm-regression-suite-author

[pf-config]: https://promptfoo.dev/docs/configuration/guide/
[pf-testcases]: https://promptfoo.dev/docs/configuration/test-cases/
[pf-asserts]: https://promptfoo.dev/docs/configuration/expected-outputs/
[pf-ref]: https://promptfoo.dev/docs/configuration/reference/
[pf-cli]: https://promptfoo.dev/docs/usage/command-line/
[pf-openai]: https://promptfoo.dev/docs/providers/openai/
[pf-gha]: https://promptfoo.dev/docs/integrations/github-action/
[de-gh]: https://github.com/confident-ai/deepeval
[de-start]: https://deepeval.com/docs/getting-started
[de-datasets]: https://deepeval.com/docs/evaluation-datasets

A regression suite for LLM outputs pairs a **versioned golden dataset** (stable
inputs + expected outputs) with **deterministic eval settings** and a
**pass-rate gate** so that promoting a model from v1 to v2 surfaces quality
drops before they reach production. The per-tool skills
(`promptfoo-evaluation`, `deepeval-evaluation`) handle tool mechanics;
this skill handles the versioning workflow that neither covers.

## When to use

- A vendor announces a model update (e.g., `gpt-4.1` to `gpt-5`) and you
  need a before/after quality comparison on your own inputs.
- A prompt regression suite exists but has no stable dataset version tied to
  each model snapshot, so regressions are discovered in production.
- CI must gate a model-version bump the same way it gates a code change.

## Step 1 - Structure the golden dataset

A golden dataset is a versioned file of (input, expected output) pairs. Use
JSONL for line-by-line diffability or CSV for spreadsheet collaboration.

**JSONL format** (one object per line, per [de-datasets][de-datasets]):

```jsonl
{"input": "What is the return policy?", "expected_output": "30-day full refund"}
{"input": "How do I cancel?", "expected_output": "Visit account settings > Cancel"}
```

**CSV format** with promptfoo assertion columns
(per [pf-testcases][pf-testcases]):

```csv
input,__expected,__description
"What is the return policy?","contains: 30-day","return-policy-basic"
"Summarize the refund terms","llm-rubric: Mentions 30 days and no extra costs","refund-summary"
"Return JSON of policy","is-json","structured-output"
```

Per [pf-testcases][pf-testcases]: `__expected` values follow `TYPE: VALUE`
syntax; values without a prefix default to `equals`. Multiple assertions use
numbered columns (`__expected1`, `__expected2`).

**Versioning convention:**

```
datasets/
  golden-v1.0.0.jsonl    # baseline: current production model
  golden-v1.1.0.jsonl    # new cases added for feature coverage
  golden-current -> golden-v1.1.0.jsonl   # symlink or CI var
```

Tag the dataset file together with the model snapshot it was authored against.
Treat dataset changes the same as schema changes: they need a version bump,
a changelog entry, and a corresponding CI run that captures the new baseline
scores before the dataset becomes `golden-current`.

## Step 2 - Configure deterministic eval

Non-determinism is the primary enemy of regression suites. Set
`temperature: 0` and `seed` at the provider level so identical inputs
produce identical outputs on re-run.

**Promptfoo** (per [pf-openai][pf-openai]):

```yaml
# promptfooconfig-regression.yaml
providers:
  - id: openai:chat:gpt-4.1       # baseline model (pinned snapshot)
    config:
      temperature: 0
      seed: 42
  - id: openai:chat:gpt-5.4-mini  # candidate model
    config:
      temperature: 0
      seed: 42

tests: file://datasets/golden-current.csv

evaluateOptions:
  repeat: 1               # per [pf-ref]: "Number of times to run each test case"
  cache: true             # per [pf-ref]: reuses disk-cached responses for unchanged inputs
```

Per [pf-openai][pf-openai]: `seed` is "used for deterministic output" and
belongs in the provider's `config` block. Note that OpenAI's API makes
best-effort determinism guarantees with `seed`; treat repeated runs as a
sanity check, not a hard guarantee.

**DeepEval** (per [de-start][de-start]): pin the judge model version in every
metric constructor to prevent the judge drifting independently of the model
under test:

```python
from deepeval.metrics import GEval
from deepeval.test_case import SingleTurnParams

correctness = GEval(
    name="Correctness",
    criteria="Actual output is factually correct given the expected output.",
    evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.EXPECTED_OUTPUT],
    model="gpt-4.1-2025-04-14",   # pinned judge snapshot
    threshold=0.7,
)
```

Per [de-start][de-start]: `threshold` determines pass/fail; "a metric is only
successful if the evaluation score is equal to or greater than `threshold`."

## Step 3 - Layer the assertion types

A robust regression suite combines four assertion layers. Each layer catches a
different failure mode.

**Layer 1: Exact / structural (deterministic)**
Per [pf-asserts][pf-asserts]: `equals`, `contains`, `regex`, `is-json`,
`starts-with`. Use when the expected output is fully predictable.

```yaml
assert:
  - type: equals
    value: "30-day full refund at no extra cost"
  - type: is-json        # for structured-output test cases
```

**Layer 2: Semantic similarity**
Per [pf-asserts][pf-asserts]: `similar` uses embeddings + cosine similarity.
Use when paraphrase equivalence is acceptable:

```yaml
assert:
  - type: similar
    value: "Customers receive a full refund within 30 days"
    threshold: 0.82
    provider: openai:text-embedding-3-small
```

**Layer 3: LLM-as-judge**
Per [pf-asserts][pf-asserts]: `llm-rubric` grades output against a
free-form rubric; `factuality` checks output against reference facts.

```yaml
assert:
  - type: llm-rubric
    value: "Response is polite, concise, and mentions the 30-day window"
  - type: factuality
    value: "Return window is 30 days. No extra cost."
```

**Layer 4: Rubric (DeepEval GEval)**
Per [de-gh][de-gh]: `GEval` with explicit `evaluation_steps` produces more
consistent scores than criteria-only mode because it avoids regenerating
chain-of-thought steps on each call.

```python
policy_rubric = GEval(
    name="PolicyAccuracy",
    evaluation_steps=[
        "Check if the response mentions a 30-day return window.",
        "Check if the response states there is no extra cost.",
        "Penalise responses that add false conditions.",
    ],
    evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.EXPECTED_OUTPUT],
    model="gpt-4.1-2025-04-14",
    threshold=0.75,
)
```

## Step 4 - Set pass-rate threshold and capture baseline

Run the suite against the **baseline model** first and record the aggregate
pass rate. This becomes the floor the candidate model must meet or beat.

**Promptfoo** uses a test-level `threshold` (per [pf-ref][pf-ref]): "Test will
fail if the combined score of assertions is less than this number." Group
related assertions with `assert-set` to set a partial-pass floor:

```yaml
defaultTest:
  assert:
    - type: assert-set
      threshold: 0.8      # 80% of grouped assertions must pass
      assert:
        - type: similar
          value: "{{expected}}"
          threshold: 0.8
        - type: llm-rubric
          value: "Accurate and helpful"
```

Capture the JSON output of the baseline run for diff comparison
(per [pf-cli][pf-cli]: `-o` flag supports `json`, `csv`, `junit.xml`):

```bash
# Baseline run (production model only)
promptfoo eval --config promptfooconfig-regression.yaml \
  --filter-pattern ".*" \
  -o results/baseline-gpt-4.1-$(date +%Y%m%d).json
```

**DeepEval** baseline capture:

```python
from deepeval import evaluate
from deepeval.dataset import EvaluationDataset

dataset = EvaluationDataset()
dataset.add_goldens_from_jsonl_file(file_path="datasets/golden-current.jsonl")

# Generate actual_output from baseline model, attach to test cases, then:
results = evaluate(
    test_cases=dataset.test_cases,
    metrics=[correctness, policy_rubric],
)
# Inspect results.test_results for per-case scores; store to JSON for diff
```

Per [de-datasets][de-datasets]: `add_goldens_from_jsonl_file` requires
`file_path` as the absolute path; each line maps to a `Golden`.

## Step 5 - Diff candidate vs baseline

After the candidate model run, compare aggregate pass rates:

```bash
# Candidate run (both models in one config)
promptfoo eval --config promptfooconfig-regression.yaml \
  -o results/candidate-gpt-5.4-mini-$(date +%Y%m%d).json

# Simple diff: extract pass rates from JSON output
python3 scripts/regression_diff.py \
  results/baseline-gpt-4.1-20260604.json \
  results/candidate-gpt-5.4-mini-20260604.json \
  --threshold 0.95   # candidate must retain >=95% of baseline pass rate
```

The `regression_diff.py` script pattern:

```python
import json, sys

def pass_rate(path):
    data = json.load(open(path))
    results = data["results"]["results"]
    passed = sum(1 for r in results if r["success"])
    return passed / len(results)

baseline_rate = pass_rate(sys.argv[1])
candidate_rate = pass_rate(sys.argv[2])
threshold = float(sys.argv[3].replace("--threshold ", "").split("=")[-1]) \
    if len(sys.argv) > 3 else 0.95

ratio = candidate_rate / baseline_rate if baseline_rate > 0 else 0
print(f"Baseline: {baseline_rate:.2%}  Candidate: {candidate_rate:.2%}  Ratio: {ratio:.3f}")
if ratio < threshold:
    print(f"REGRESSION: candidate retains only {ratio:.1%} of baseline pass rate")
    sys.exit(1)
print("PASS: no regression detected")
```

Per [pf-cli][pf-cli]: `--filter-failing <path>` re-runs only cases that
failed in a prior eval result file, useful for targeted investigation after
a regression is detected.

## Step 6 - CI gating

Store the baseline JSON as a CI artifact or in version control alongside the
dataset version tag. The CI job fails if the regression ratio drops below the
threshold.

**GitHub Actions pattern** (per [pf-gha][pf-gha] and [de-gh][de-gh]):

```yaml
name: llm-regression

on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'datasets/**'
      - '.github/workflows/llm-regression.yml'

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Restore baseline artifact
        uses: actions/download-artifact@v4
        with:
          name: llm-baseline
          path: results/

      - name: Run candidate eval (promptfoo)
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npx promptfoo@latest eval \
            --config promptfooconfig-regression.yaml \
            -o results/candidate.json

      - name: Check regression threshold
        run: python3 scripts/regression_diff.py results/baseline.json results/candidate.json --threshold=0.95

      # On main: update the baseline artifact after a passing run
      - name: Upload new baseline
        if: github.ref == 'refs/heads/main' && success()
        uses: actions/upload-artifact@v4
        with:
          name: llm-baseline
          path: results/candidate.json
```

For DeepEval: `deepeval test run tests/llm_regression/ --workers 4`
returns a non-zero exit code when any `assert_test()` call fails
(per [de-gh][de-gh]), which CI treats as a pipeline failure.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Dataset mutated without a version bump | Baseline scores become meaningless | Tag dataset file with the model snapshot it was authored against |
| No `temperature: 0` on candidate model | Non-deterministic outputs make pass rate noisy | Set `temperature: 0` + `seed` at provider level (Step 2) |
| Only LLM-as-judge assertions | Judge cost scales linearly; judge model drifts too | Layer deterministic assertions first; use judge only where needed (Step 3) |
| Pass-rate threshold of 1.0 | Any new case added to the dataset will fail until outputs are updated | Use a ratio vs baseline (e.g., 0.95) rather than an absolute floor |
| Baseline JSON not stored in version control | No reproducible diff when investigating a regression | Commit baseline JSON alongside the dataset version tag |
| Pinning "latest" model in CI | Provider silently updates the model; baseline shifts without notice | Pin explicit model snapshots (e.g., `gpt-4.1-2025-04-14`) |
| Single assertion type across all cases | Structural failures masked by rubric leniency (or vice versa) | Use all four assertion layers proportionate to case type (Step 3) |

## Limitations

- Temperature 0 + seed provides best-effort determinism; OpenAI's API does
  not guarantee byte-identical outputs across model updates even with seed set.
  Run the baseline immediately before the candidate when strict diff is needed.
- LLM-as-judge metrics add cost (roughly 2x a deterministic-only eval per
  [pf-asserts][pf-asserts]) and require pinning the judge model version
  separately from the model under test.
- DeepEval's `EvaluationDataset` is stateful (single-turn or multi-turn at
  init per [de-datasets][de-datasets]); mixing turn types requires separate
  dataset instances.
- The regression diff script above is a reference pattern; adapt the JSON
  key paths to match the output format version of the runner you use.

## References

- [pf-config][pf-config] - promptfoo configuration guide
- [pf-testcases][pf-testcases] - CSV/JSONL/JSON test file formats + `__expected` column syntax
- [pf-asserts][pf-asserts] - full assertion catalog (deterministic, semantic, LLM-as-judge)
- [pf-ref][pf-ref] - evaluateOptions fields (`repeat`, `cache`, `threshold`)
- [pf-cli][pf-cli] - CLI output formats and `--filter-failing` flag
- [pf-openai][pf-openai] - provider-level `temperature` and `seed` config
- [pf-gha][pf-gha] - GitHub Actions integration
- [de-gh][de-gh] - DeepEval install, quickstart, metric list, CI exit codes
- [de-start][de-start] - DeepEval getting started, `GEval` threshold semantics
- [de-datasets][de-datasets] - `EvaluationDataset` load methods (CSV/JSONL/JSON/pull)
- `promptfoo-evaluation` - promptfoo tool mechanics
- `deepeval-evaluation` - DeepEval tool mechanics
