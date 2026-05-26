---
name: openai-evals
description: "Authors and runs OpenAI Evals — Python framework + registry for evaluating LLMs and LLM-backed systems with `oaieval <model> <eval-name>` CLI; supports template-based evals (Match / Includes / FuzzyMatch / ModelBasedClassify) defined in `evals/registry/evals/*.yaml` against JSONL data files in `evals/registry/data/`, plus custom Python eval classes implementing the Eval interface. Use when the user works with the openai/evals repo, needs the OpenAI-curated eval registry, or contributes new evals via PR to the registry."
rating: 22
d6: 4
archetype: S1
---

# openai-evals

## Overview

[oa-gh]: https://github.com/openai/evals

Per [oa-gh][oa-gh], a registry of YAML eval-specs lives under
`evals/registry/evals/`, each pointing to a JSONL data file under
`evals/registry/data/` (Git-LFS managed). The `oaieval` CLI runs
an eval against any completion-function-protocol model — either
one of OpenAI's curated evals or a custom one registered by the
team.

## When to use

- The team contributes evals upstream to OpenAI's registry.
- The user needs the broad set of OpenAI-curated evals as a
  baseline.
- A custom Python eval class is required (e.g., complex grading
  logic that doesn't fit YAML templates).
- The team standardized on OpenAI Evals before alternatives like
  Promptfoo / DeepEval emerged.

For new projects without a registry-contribution motive, evaluate
[`promptfoo-evaluation`](../promptfoo-evaluation/SKILL.md) or
[`deepeval-evaluation`](../deepeval-evaluation/SKILL.md) first —
both have lower friction for non-OpenAI workflows.

## Step 1 — Install

For running existing evals (per [oa-gh][oa-gh]):

```bash
pip install evals
```

For contributing new evals (clone first, then editable install):

```bash
git clone https://github.com/openai/evals.git
cd evals
pip install -e .
```

The editable install is required to register new evals and access
the full registry source.

## Step 2 — Run an eval

Per [github.com/openai/evals/blob/main/docs/run-evals.md][oa-run]:

[oa-run]: https://github.com/openai/evals/blob/main/docs/run-evals.md

```bash
oaieval gpt-3.5-turbo test-match
```

Pattern: `oaieval <model> <eval-name>`. Per [oa-run][oa-run]:

> "Any implementation of the CompletionFn protocol can be run
> against oaieval."

Eval names are `"specified in the YAML files under
evals/registry/evals"` ([oa-run][oa-run]); implementations live in
`evals/elsuite`.

## Step 3 — Logging

Per [oa-run][oa-run]:

> "logging locally or to Snowflake will write to tmp/evallogs"

Override with `--record_path /custom/path/`. Logs are JSONL events
"which can be inspected using a text editor or analyzed
programmatically" ([oa-run][oa-run]).

Common flags ([oa-run][oa-run]):

- `--no-local-run` — Snowflake DB logging
- `--record_path <dir>` — output directory
- `oaieval --help` — full CLI options

## Step 4 — Eval templates (YAML-defined)

Eval templates avoid Python authoring for common evaluation
patterns. The four built-in templates per [oa-gh][oa-gh] (referenced
in `eval-templates.md`):

- **Match** — exact-match scoring: completion must equal an entry in
  `ideal` (single string or list)
- **Includes** — substring scoring: completion must contain `ideal`
  text
- **FuzzyMatch** — relaxed-match scoring: token-level overlap
  between completion and ideal
- **ModelBasedClassify** — judge-model evaluates a completion (used
  for open-ended outputs where exact-match doesn't apply)

A registered eval YAML lives at `evals/registry/evals/<name>.yaml`
and references a JSONL file at `evals/registry/data/<name>/samples.jsonl`.
Each JSONL row contains the input prompt + the `ideal` field used by
the template.

## Step 5 — Custom Python evals

For grading logic beyond templates, subclass the `Eval` interface.
The full pattern lives in `docs/custom-eval.md` and `docs/build-eval.md`
in the [oa-gh][oa-gh] repository — author per the doc when authoring,
then register in the YAML registry.

## Step 6 — CI integration

OpenAI Evals does not ship a first-party CI action. Pattern:

```bash
oaieval gpt-4 my-eval --record_path ./evallogs
# parse JSONL evallog for pass-rate; fail CI if below threshold
jq -s '[.[] | select(.spec) | .]' ./evallogs/<run>.jsonl  # extract spec + outcomes
```

For PR-comment integration, parse the events JSONL into a summary
and post via gh CLI (no built-in action).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Pick `Match` template for open-ended generation | Exact-match always fails on creative outputs | Use `ModelBasedClassify` (Step 4) |
| Skip `--record_path` in CI | Logs land in `/tmp` and disappear between steps | Always pass `--record_path` |
| Custom Python eval without registry YAML | `oaieval` can't find it | Register the YAML alongside the Python class (Step 5) |
| Run on `gpt-3.5-turbo` only | Model-version drift; results not reproducible | Pin specific snapshot (e.g., `gpt-4-0613`) |

## Limitations

- OpenAI-first design — non-OpenAI providers via the
  CompletionFn protocol work but require shim code; for
  multi-provider evals start with [`promptfoo-evaluation`](../promptfoo-evaluation/SKILL.md).
- The registry is large but dated — many evals target older OpenAI
  models; check eval-spec freshness before contributing.
- No first-party CI integration — assemble pass-rate gates
  manually.
- JSONL log inspection requires familiarity with the events
  schema (per-event types: `sampling`, `match`, `metrics`).

## References

- [oa-gh][oa-gh] — main repo + framework overview
- [oa-run][oa-run] — `oaieval` CLI reference
- `docs/build-eval.md`, `docs/custom-eval.md`, `docs/eval-templates.md`
  in [oa-gh][oa-gh] — authoring details (load from repo when
  building a new eval)
- [`promptfoo-evaluation`](../promptfoo-evaluation/SKILL.md),
  [`deepeval-evaluation`](../deepeval-evaluation/SKILL.md) —
  lower-friction alternatives for new projects
- [`prompt-eval-reviewer`](../../agents/prompt-eval-reviewer.md) —
  adversarial reviewer
