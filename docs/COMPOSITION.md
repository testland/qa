# Composition graph — agent → skill preloads

Per the master plan's cross-cutting Task X.1, this document maps every
agent's `skills:` preload list. It is regenerated from the source
files via `scripts/composition-graph.py`.

## Scope

- **170 skills** across 30 plugins.
- **46 agents** across 30 plugins.
- **33 agents** preload one or more skills (~72%).
- **13 agents** carry their own context inline (no preloads).
- **4 cross-plugin preload edges** — the rest stay within their own
  plugin.

## How preloading works

A Claude Code agent file may declare:

```yaml
---
name: my-agent
description: ...
tools: Read, Bash(jq *)
skills:
  - skill-a
  - skill-b
---
```

When the agent is dispatched, the bodies of `skill-a` and `skill-b`
are loaded into the agent's context before the agent body runs.
This lets agents stay short (~30–60 lines) while reusing reference
material that lives in skills.

## Per-plugin preload map

### qa-accessibility-specifics

| Agent | Preloads |
|---|---|
| `accessibility-code-critic` | `wcag-keyboard-navigation`, `wcag-focus-trap`, `wcag-color-contrast`, `aria-authoring-patterns` |

### qa-ai-assisted

| Agent | Preloads |
|---|---|
| `ai-test-curator` | `test-code-conventions` *(qa-test-review)* |

### qa-bdd

| Agent | Preloads |
|---|---|
| `gherkin-style-reviewer` | (none — agent is fully self-contained) |

### qa-bug-repro

| Agent | Preloads |
|---|---|
| `bug-repro-builder` | `bug-report-template` |
| `crash-stack-trace-analyzer` | (none) |
| `defect-clusterer` | (none) |
| `escape-defect-analyzer` | `bug-report-template` |

### qa-contract-testing

| Agent | Preloads |
|---|---|
| `contract-drift-investigator` | `pact-contract-testing`, `openapi-contract-diff`, `graphql-schema-regression`, `protobuf-compat-checking` |

### qa-data-quality

| Agent | Preloads |
|---|---|
| `data-anomaly-triager` | `dbt-testing`, `great-expectations`, `soda-checks` |
| `data-quality-engineer` | `dbt-testing`, `great-expectations`, `soda-checks`, `data-quality-conventions` |
| `schema-diff-reviewer` | `dbt-testing` |

### qa-flake-triage

| Agent | Preloads |
|---|---|
| `ai-flake-detector` | `flake-pattern-reference` |
| `e2e-flake-bisector` | `flake-pattern-reference`, `flaky-test-quarantine` |
| `e2e-test-trend-reporter` | `flake-pattern-reference` |
| `parallel-isolation-checker` | `flake-pattern-reference` |
| `regression-bisector` | (none) |

### qa-iac

| Agent | Preloads |
|---|---|
| `iac-policy-checker` | `checkov-policy`, `tfsec-policy`, `kics-policy` |
| `terraform-plan-reviewer` | (none) |

### qa-load-testing

| Agent | Preloads |
|---|---|
| `perf-regression-bisector` | `k6-load-testing`, `lighthouse-perf`, `flame-graph-analyzer`, `db-slow-query-detector` |

### qa-manual-testing

| Agent | Preloads |
|---|---|
| `exploratory-charter-author` | (none) |

### qa-mutation-testing

| Agent | Preloads |
|---|---|
| `mutation-survivor-explainer` | (none) |

### qa-process

| Agent | Preloads |
|---|---|
| `release-readiness-checker` | `definition-of-done`, `smoke-suite-gate` |
| `risk-based-test-planner` | `risk-matrix`, `test-strategy-author` |
| `risk-based-test-selector` | `risk-matrix` |
| `test-quality-coach` | `test-code-conventions` *(qa-test-review)* |

### qa-roles

| Agent | Preloads |
|---|---|
| `quality-coach` | (none) |
| `release-engineer` | (none) |
| `test-architect` | `regression-suite-selector` *(qa-test-impact-analysis)* |

### qa-shift-left

| Agent | Preloads |
|---|---|
| `definition-of-done-checker` | (none) |
| `spec-to-suite-orchestrator` | `acceptance-criteria-extractor`, `nfr-extractor`, `data-contract-extractor` |
| `testability-reviewer` | (none) |
| `threat-model-from-spec` | (none) |

### qa-shift-right

| Agent | Preloads |
|---|---|
| `observability-to-test` | `synthetic-monitor-author` |
| `production-tester` | `synthetic-monitor-author` |

### qa-test-data

| Agent | Preloads |
|---|---|
| `golden-file-manager` | `golden-file-conventions` |

### qa-test-environment

| Agent | Preloads |
|---|---|
| `db-snapshot-restore` | `testcontainers`, `docker-compose-test` |

### qa-test-impact-analysis

| Agent | Preloads |
|---|---|
| `regression-suite-curator` | `regression-suite-selector` |
| `test-suite-pruner` | `regression-suite-selector` |

### qa-test-review

| Agent | Preloads |
|---|---|
| `assertion-quality-reviewer` | `test-code-conventions` |
| `e2e-selector-quality-critic` | `test-code-conventions` |
| `mocking-anti-pattern-detector` | `test-code-conventions` |
| `test-code-critic` | `test-code-conventions` |

### qa-visual-regression

| Agent | Preloads |
|---|---|
| `visual-baseline-curator` | `percy-visual-regression-testing`, `chromatic-visual-regression-testing`, `playwright-snapshots`, `storybook-visual-regression-testing`, `responsive-breakpoint-runner`, `visual-baseline-conventions` |
| `visual-diff-classifier` | `percy-visual-regression-testing`, `chromatic-visual-regression-testing`, `playwright-snapshots`, `visual-baseline-conventions` |

### qa-web-e2e

| Agent | Preloads |
|---|---|
| `playwright-codegen-reviewer` | `test-code-conventions` *(qa-test-review)* |
| `selenium-grid-orchestrator` | (none) |

## Cross-plugin preload edges

Most agents preload skills from their own plugin. The 4 documented
cross-plugin edges:

| Consumer | Producer | Skill | Why |
|---|---|---|---|
| `qa-ai-assisted/ai-test-curator` | `qa-test-review` | `test-code-conventions` | AI-generated tests are reviewed against the same hygiene catalog as human-authored ones. |
| `qa-process/test-quality-coach` | `qa-test-review` | `test-code-conventions` | The coach uses the same conventions reference (continuous-improvement framing vs `test-code-critic`'s sharp-critic framing). |
| `qa-roles/test-architect` | `qa-test-impact-analysis` | `regression-suite-selector` | Architect reads change-set shape; needs the selector's heuristics for pyramid recommendations. |
| `qa-web-e2e/playwright-codegen-reviewer` | `qa-test-review` | `test-code-conventions` | Codegen output is reviewed against the same selector / assertion hygiene rules. |

When a user installs a consumer plugin (e.g., `qa-process`), they
should also install the producer plugin (`qa-test-review`) for the
preload to resolve. This is a **soft dependency**: the agent still
runs without the preload, but with degraded context.

A future enhancement (Task X.1 step 3 follow-up) would add a
`requires:` field to plugin manifests once the Claude Code spec
supports it; until then, cross-plugin preloads are documented here.

## Validation

The composition graph is validated by `scripts/composition-graph.py`:

```bash
python scripts/composition-graph.py
```

Exit code 0 means every preloaded skill name resolves to a real
SKILL.md somewhere in the marketplace. Exit code 1 surfaces missing
references.

## Regenerating this document

After any agent's `skills:` field changes:

1. Run `python scripts/composition-graph.py` to confirm no missing
   references.
2. Update the affected plugin's section in this file.
3. Update the cross-plugin table if the change crosses a plugin
   boundary.
4. Commit alongside the agent change.

## References

- Master plan: cross-cutting Task X.1 (Composition validation).
- `docs/PLUGIN_AUTHORING.md` — agent body authoring guide
  (preload semantics).
- `docs/REVIEWER_CHECKLIST.md` — reviewer rubric (preload
  alignment is part of D5 Composability).
