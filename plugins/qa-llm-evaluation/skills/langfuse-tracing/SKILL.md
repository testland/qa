---
name: langfuse-tracing
description: "Wires Langfuse tracing into LLM apps for production observability and offline eval - instruments via `@observe` (Python) / `startActiveObservation` (TS) decorators that auto-capture inputs / outputs / timings / errors per generation; exposes `langfuse.update_current_span()` for metadata + cost / latency annotation; supports trace-bound scoring for eval datasets and prompt-as-code management. Use when the user needs production LLM observability beyond pre-deploy eval, or wants to ship traces from production to an eval dataset for offline regression testing."
---

# langfuse-tracing

## Overview

[lf-gh]: https://github.com/langfuse/langfuse-python

Langfuse complements pre-deploy LLM eval (Promptfoo / DeepEval /
Ragas / Giskard) with production-side observability - captures every
LLM call as a `trace` containing nested `observation`s (generations,
spans, events), with token / cost / latency metadata, scores, and
linked datasets for offline eval (per [lf-gh][lf-gh]).

**Important version note (2026-05-06):** per [lf-gh][lf-gh], "The
SDK was rewritten in v4 and released in March 2026" - this skill
targets the v4 API. For v3 codebases, see the upstream migration
guide.

## When to use

- An LLM app is in production and the team needs observability:
  per-call traces, cost/latency dashboards, error tracking.
- The team wants to capture production traces into an eval dataset
  for offline regression testing.
- Prompt-as-code management is needed (version pin prompts, A/B
  test prompt variants in production).
- An eval framework (Promptfoo / DeepEval / Ragas / Giskard) is
  in place pre-deploy; Langfuse extends it post-deploy.

## Step 1 - Install

Per [lf-gh][lf-gh]:

```bash
pip install langfuse
```

For TypeScript:

```bash
npm install @langfuse/tracing
```

Set up project credentials per Langfuse self-hosted or cloud
project (`LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` +
`LANGFUSE_HOST`).

## Step 2 - Instrument with `@observe`

Per [langfuse.com/docs/sdk/python/decorators][lf-py-deco]:

[lf-py-deco]: https://langfuse.com/docs/sdk/python/decorators

Python:

```python
from langfuse import observe

@observe(name="llm-call", as_type="generation")
async def my_async_llm_call(prompt_text):
    return "LLM response"
```

The decorator "automatically captures inputs, outputs, timings, and
errors without modifying function logic" (per [lf-py-deco][lf-py-deco]).

TypeScript:

```typescript
import { startActiveObservation, startObservation } from "@langfuse/tracing";
```

(Per [lf-py-deco][lf-py-deco]; the TS SDK uses an explicit
`startObservation` API rather than a decorator.)

## Step 3 - Update current observation with metadata

Per [lf-py-deco][lf-py-deco]:

```python
from langfuse import get_client

langfuse = get_client()

with langfuse.start_as_current_observation(as_type="span", name="data-processing"):
    langfuse.update_current_span(metadata={"step1_complete": True})
```

Common metadata fields used in production:

- `model` - the model name (e.g., `claude-haiku-4-5`)
- `model_parameters` - temperature / top_p / max_tokens
- `usage` - input/output tokens, cost
- `tags` - environment (`prod` / `staging`), feature flag, customer ID
- `level` - `DEBUG` / `DEFAULT` / `WARNING` / `ERROR`

## Step 4 - Score traces

Scores attach evaluation results to a trace or observation. Three
data types per Langfuse: numeric (0 - 1), categorical (string), boolean
(true/false). The full API and example invocation live at
[langfuse.com/docs/scores][lf-scores]; the trace-side wiring is:

[lf-scores]: https://langfuse.com/docs/scores

```python
langfuse.score(
    trace_id="...",
    name="answer_relevance",
    value=0.87,           # numeric
    comment="Judged by GPT-4 rubric"
)
```

Per [lf-scores][lf-scores] the current Python SDK API is the source
of truth - consult that page when wiring scores. Scores can come from:

- **Manual review** (human raters via the Langfuse UI)
- **Automated eval** (run a metric in batch, score by `trace_id`)
- **User feedback** (thumbs-up / thumbs-down from the app)

## Step 5 - Datasets for offline eval

Langfuse datasets (collections of `(input, expected_output)` items)
can be:

- Built from production traces (capture inputs that produced bad
  scores; promote them into a regression dataset)
- Pulled from CSV / JSONL imports
- Hand-authored via the Langfuse UI

Run a dataset:

```python
items = langfuse.get_dataset_items(dataset_id="...")
for item in items:
    actual = my_llm_app(item.input)
    item.run(actual)  # links the run back to the dataset for diff vs baseline
```

(API exact signature evolves; see [langfuse.com/docs/datasets][lf-ds].)

[lf-ds]: https://langfuse.com/docs/datasets

## Step 6 - Prompt management

Pin prompt versions in code; iterate prompts in the Langfuse UI;
roll out new prompt versions per environment (`production` /
`staging` labels) without code deploys. The `langfuse.get_prompt()`
API fetches the current production prompt at runtime.

## Step 7 - CI integration

Langfuse is observability-side, not pre-deploy CI-side. CI integration
patterns:

- **Eval-on-trace**: post-deploy, run an offline eval sweep against
  production traces from the previous N hours; fail if regression.
- **Score-based alerting**: alert on drop in average `answer_relevancy`
  score over a rolling window.
- **Cost regression**: alert on per-trace cost increase that exceeds
  budget.

These are dashboard / alerting wires (Langfuse → PagerDuty / Slack /
Datadog), not CI-pipeline assertions.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Trace everything in production with no sampling | Cost explodes at scale | Use `level=DEBUG` + UI-side sampling (Step 3) |
| Score traces only via UI (no automated path) | Can't catch silent regressions | Automated `langfuse.score()` per trace (Step 4) |
| Pull production trace inputs without privacy review | PII leakage into eval datasets | Cross-ref `qa-test-data/synthetic-pii-generator` for fixture sanitization before promotion |
| Skip prompt versioning | Prompt drift breaks attribution | `langfuse.get_prompt()` with version pin (Step 6) |
| Conflate Langfuse with pre-deploy eval | Tries to be both; wins neither | Pair Langfuse (post-deploy) with Promptfoo/DeepEval/Ragas (pre-deploy) |

## Limitations

- Langfuse cloud is hosted; for data-residency-strict teams,
  self-host (well-supported but operational overhead).
- v4 API rewrite (March 2026) - pin SDK version in requirements;
  v3 patterns no longer supported per [lf-gh][lf-gh].
- Integration with eval frameworks evolves rapidly; consult
  [langfuse.com/docs][lf-docs] for current Promptfoo / DeepEval /
  Ragas integration patterns.
- Score-API exact signature may drift between SDK versions;
  always check [lf-scores][lf-scores] when authoring score wiring.

[lf-docs]: https://langfuse.com/docs

## References

- [lf-gh][lf-gh] - Python SDK repo, install, version note
- [lf-py-deco][lf-py-deco] - `@observe` decorator + observation
  patterns
- [lf-scores][lf-scores] - score API
- [lf-ds][lf-ds] - datasets
- [lf-docs][lf-docs] - full documentation
- [`promptfoo-evaluation`](../promptfoo-evaluation/SKILL.md),
  [`deepeval-evaluation`](../deepeval-evaluation/SKILL.md),
  [`ragas-evaluation`](../ragas-evaluation/SKILL.md),
  [`giskard-llm`](../giskard-llm/SKILL.md) - pre-deploy eval sister
  tools
- [`prompt-eval-reviewer`](../../agents/prompt-eval-reviewer.md) - 
  adversarial reviewer that flags eval suites without observability
  feedback loop
