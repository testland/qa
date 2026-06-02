---
name: promptfoo-evaluation
description: "Authors and runs Promptfoo evals for LLM prompts and RAG pipelines - wires `promptfooconfig.yaml` providers + prompts + tests + assertions (deterministic `equals` / `contains` / `is-json` / `regex`, semantic `similar`, model-graded `llm-rubric` / `factuality` / `g-eval`, performance `latency` / `cost`, custom `javascript` / `python`), runs `npx promptfoo eval`, views HTML report via `promptfoo view`, and integrates CI for regression gating. Use when the user runs Promptfoo, asks about prompt regression suites, or needs an eval-driven workflow for LLM-backed features."
rating: 24
d6: 4
archetype: S1
---

# promptfoo-evaluation

[pf-intro]: https://promptfoo.dev/docs/intro/
[pf-config]: https://promptfoo.dev/docs/configuration/guide/

A `promptfooconfig.yaml` declares **providers** (LLMs under test),
**prompts** (templates with `{{var}}` placeholders), **tests**
(input variables + assertions); `promptfoo eval` runs the
cross-product (per [pf-config][pf-config]).

## When to use

- The repo has a `promptfooconfig.yaml` or the user wants to
  author one.
- The user needs prompt regression suites - same inputs, multiple
  providers, fail-on-diff.
- A CI workflow needs an eval gate on prompt or model changes.
- The team prefers vendor-neutral eval (vs OpenAI Evals' OpenAI-first
  posture).

## Step 1 - Install

Per [github.com/promptfoo/promptfoo][pf-gh]:

[pf-gh]: https://github.com/promptfoo/promptfoo

```bash
npm install -g promptfoo
# or
brew install promptfoo
# or one-off
npx promptfoo@latest
```

Per [pf-gh][pf-gh]: "Node.js 20.20+ or 22.22+ is required for npm
and npx usage."

## Step 2 - First eval

Initialize from a built-in example, then run:

```bash
promptfoo init --example getting-started
cd getting-started
promptfoo eval
promptfoo view  # opens HTML report
```

(Commands per [pf-gh][pf-gh].)

A minimal `promptfooconfig.yaml` per [pf-config][pf-config]:

```yaml
prompts:
  - file://prompt1.txt

providers:
  - openai:gpt-5-mini
  - anthropic:claude-haiku-4-5

tests:
  - vars:
      language: French
      input: Hello world
    assert:
      - type: contains-json
```

Provider syntax `<vendor>:<model>` works for OpenAI, Anthropic,
Vertex (`vertex:gemini-2.0-flash-exp`), Ollama (`ollama:llama2`), and
30+ others (per [pf-config][pf-config]).

## Step 3 - Variable interpolation

Vars interpolate into prompts using `{{variable}}`. Arrays create
combinations (per [pf-config][pf-config]):

```yaml
tests:
  - vars:
      language: [French, German, Spanish]
      input: [Hello world, Good morning]
```

This generates 6 test rows (3 languages × 2 inputs). Vars can also
load from files:

```yaml
tests:
  - vars:
      var3: file://path/to/var3.txt
      context: file://fetch_from_vector_database.py
```

## Step 4 - Assertion catalog

Per [promptfoo.dev/docs/configuration/expected-outputs/][pf-asserts]:

[pf-asserts]: https://promptfoo.dev/docs/configuration/expected-outputs/

**Deterministic (string + structure):**

| Type | Example |
|---|---|
| `equals` | `value: 'expected string'` |
| `contains` / `icontains` | `value: 'substring'` (case-sensitive / insensitive) |
| `starts-with` | `value: 'prefix'` |
| `contains-any` / `contains-all` | `value: ['a', 'b']` |
| `regex` | `value: '^pattern$'` |
| `is-json` / `contains-json` | (validates / locates JSON) |
| `is-sql` / `contains-sql` | (SQL syntax) |
| `is-xml` / `is-html` / `contains-xml` / `contains-html` | (markup) |
| `is-valid-openai-tools-call` / `is-valid-openai-function-call` | (tool calls) |

**Custom logic:**

```yaml
- type: javascript
  value: 'output.length > 10'
- type: python
  value: 'file://script.py'
```

**Text-quality metrics** (default thresholds per [pf-asserts][pf-asserts]):

| Type | Default threshold |
|---|---|
| `rouge-n` | 0.75 |
| `bleu` | 0.5 |
| `gleu` | 0.5 |
| `meteor` | 0.5 |
| `levenshtein` | 5 (edit distance max) |

**Performance + cost:**

```yaml
- type: latency
  threshold: 200    # milliseconds
- type: cost
  threshold: 0.001  # dollars per response
```

**Model-graded (LLM-as-judge):**

| Type | Use |
|---|---|
| `llm-rubric` | Free-form rubric: `value: 'Is helpful and accurate'` |
| `model-graded-closedqa` | Closed-QA evaluation method |
| `factuality` | Compares against reference facts |
| `g-eval` | Chain-of-thought scoring |
| `answer-relevance` | Checks output relates to query |
| `context-faithfulness` / `context-recall` / `context-relevance` | RAG-specific |

**Semantic similarity:**

```yaml
- type: similar
  value: 'reference text'
  threshold: 0.8   # cosine similarity via embeddings
```

**Negation:** all deterministic assertions support a `not-` prefix
(`not-equals`, `not-contains`, `not-regex`, etc.) per [pf-asserts][pf-asserts].

## Step 5 - defaultTest pattern

Shared assertions/vars across all tests:

```yaml
defaultTest:
  vars:
    shared_var: 'shared content'
  assert:
    - type: llm-rubric
      value: does not describe self as AI
  options:
    provider: openai:gpt-5-mini-0613

tests:
  - vars:
      unique_var: value1
```

(Per [pf-config][pf-config].)

## Step 6 - Output transforms

Modify LLM output before assertions execute (per [pf-config][pf-config]):

```yaml
tests:
  - vars:
      body: Hello world
    options:
      transform: output.toUpperCase()
```

Or load from a file:

```yaml
options:
  transform: file://transform.js:customTransform
```

## Step 7 - assert-set grouping

Group assertions and require a threshold percentage to pass (per
[pf-asserts][pf-asserts]):

```yaml
assert:
  - type: assert-set
    threshold: 0.5   # 50% of grouped asserts must pass
    assert:
      - type: cost
        threshold: 0.001
      - type: latency
        threshold: 200
```

## Step 8 - CI integration

Provider API keys via env vars (per [pf-gh][pf-gh]: `export
OPENAI_API_KEY=sk-abc123`).

GitHub Actions pattern (per [promptfoo.dev/docs/integrations/github-action][pf-gha]):

[pf-gha]: https://promptfoo.dev/docs/integrations/github-action/

```yaml
- uses: promptfoo/promptfoo-action@v2
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    config: 'promptfooconfig.yaml'
    cache-path: '~/.cache/promptfoo'
    use-config-prompts: false
    no-share: true
    promptfoo-version: 'latest'
```

The action posts a PR comment with regression diff vs the base
branch. Caching reuses LLM responses for unchanged tests (per
[promptfoo.dev/docs/configuration/caching/][pf-cache]).

[pf-cache]: https://promptfoo.dev/docs/configuration/caching/

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Only deterministic assertions on creative outputs | LLM responses vary; rigid asserts produce flake | Use `llm-rubric` or `similar` (Step 4) |
| Single provider in config | Misses cross-provider regression | At least 2 providers per eval (Step 2) |
| No cost / latency caps | Eval cost balloons per PR | `cost` + `latency` asserts (Step 4) |
| `assert-set` with `threshold: 0` | Effectively disables grouping | Pick a real threshold (Step 7) |
| Fresh provider model on every run without pinning | Output drifts when vendor updates model | Pin specific snapshot (e.g., `openai:gpt-5-mini-0613`) |
| Skip caching in CI | Re-runs every test on every PR | `cache-path` in GHA action (Step 8) |

## Limitations

- Model-graded assertions invoke a judge LLM per test row → cost
  per test ≈ 2× a deterministic-only eval.
- Even seeded LLMs drift between provider model updates; pin model
  versions in CI to bound the regression surface.
- Promptfoo ships HTML + JSON + JUnit reporters; no native
  Markdown PR-comment formatter (use the GHA action for that).

## References

- [pf-intro][pf-intro] - overview
- [pf-config][pf-config] - full configuration guide
- [pf-asserts][pf-asserts] - assertion catalog
- [pf-gha][pf-gha] - GitHub Action
- [pf-cache][pf-cache] - caching mechanics
- [pf-gh][pf-gh] - install commands
- [`openai-evals`](../openai-evals/SKILL.md), [`deepeval-evaluation`](../deepeval-evaluation/SKILL.md), [`ragas-evaluation`](../ragas-evaluation/SKILL.md) - sister tools (different framework styles)
- [`prompt-eval-reviewer`](../../agents/prompt-eval-reviewer.md) - adversarial reviewer for any of the above
