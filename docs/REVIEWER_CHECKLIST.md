# Reviewer Checklist

Two-evaluator rubric for component PRs. Two independent reviewers should
land within 2 points of each other on the rating total — if divergence
exceeds 2 points on any single dimension, calibrate by walking through
the calibration anchors at the bottom of this file.

> **Framework version: v4.0** (8 dimensions, 0–40 scale, importable bar 28/40).
> The per-dimension sub-checks below cover D1–D6 in detail; D7 (Evaluation
> Coverage, v3.0+) and D8 (Best-Practices Adherence, v4.0+) are summarized in
> [`CONTRIBUTING.md`](CONTRIBUTING.md) §"The eight rating dimensions" and
> documented in full at
> [`elv1s42k-qa-research/qa-rating-framework-2026-05-25.md`](https://github.com/elv1s42/qa-research).
> When scoring D7 or D8, consult the framework spec directly — this checklist
> has not yet been backfilled with D7/D8 sub-check tables (Tier 5 follow-up).
> Lint script enforces v2.0 thresholds during the shadow window; v3.0 d7
> hard-gates after 2026-06-01; v4.0 d8 hard-gates after 2026-07-01.

## Pre-review smoke checks

Before scoring dimensions, confirm:

- [ ] CI is green (`validate.sh`, `rating-check.sh`, `test-validate.sh` all pass)
- [ ] Commit message includes source-fetch date and rating breakdown
- [ ] Component file is in the correct path
  (`plugins/<plugin>/skills/<name>/SKILL.md` or `plugins/<plugin>/agents/<name>.md`)
- [ ] Plugin's `README.md` component table updated with new row
- [ ] Frontmatter has `rating:`, `d6:`, `archetype:` fields

If any pre-check fails, request fixes before scoring.

## D1 — Spec compliance (0-5)

Ground: Anthropic's official Claude Code plugin spec.

- [ ] YAML frontmatter parses cleanly
- [ ] `name` is kebab-case, 1-64 chars, no `claude`/`anthropic`
- [ ] `description` is <= 1024 chars
- [ ] For agents: `tools:`, `model:`, `skills:` (if present) are valid
- [ ] For agents: Bash patterns are specific (not bare `Bash`)
- [ ] For commands: `disable-model-invocation` set as needed
- [ ] Skill lives at `skills/<name>/SKILL.md` (NOT inside `.claude-plugin/`)
- [ ] Preloaded skills (in `skills:`) exist in this plugin or a documented dependency

Score: __/5

## D2 — Archetype fit (0-5)

Ground: archetype definitions in [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md).

For skills (S1-S4):

- **S1 file-format/domain** — body has Authoring + Running + Parsing + CI sections
- **S2 pure reference** — body is a stable reference catalog; no execution steps
- **S3 build-an-X workflow** — body produces an artifact; has decision points
- **S4 toolkit/dispatcher** — body lists sub-tools and routes between them

For agents (A1-A4):

- **A1 read-only specialist** — body emits findings; `tools` are read-only
- **A2 action-taking task** — body produces files/changes; `tools` include Write/Edit
- **A3 adversarial critic** — body classifies/rejects; framed adversarially
- **A4 builder/scaffolder** — body generates new artifacts/structure

- [ ] Body shape matches declared archetype
- [ ] No archetype-mixing (e.g., agent that does both A1 read-only AND A2 action)

Score: __/5

## D3 — Description quality (0-5)

Single-description test:

- [ ] Distinguishable from 2-3 nearest neighbors (PR description must
      identify those neighbors and state the differentiation axis)
- [ ] Predictive of body content (a stranger reading only the description
      should correctly anticipate what the body does)
- [ ] Third-person, action-oriented (no "You are.../I help...")
- [ ] No `and` joining unrelated clauses
- [ ] Concrete verbs (no "helps with", "manages", "handles")
- [ ] Includes proactive trigger condition for agents ("Use when..." / "Use proactively after...")

Score: __/5

## D4 — Use-case fit (0-5)

- [ ] Explicit trigger condition in the description (matches Anthropic's
      official guidance: descriptions should "describe what the skill
      does and when to use it")
- [ ] Trigger non-overlapping with sibling components
- [ ] User can predict when to invoke (or when Claude will auto-invoke an agent)
- [ ] Doesn't duplicate functionality available in another plugin without
      a documented differentiation axis
- [ ] Sized correctly: not so narrow it's only useful once; not so broad
      that it's a "general-purpose" catch-all (persona-shaped scopes that
      can't name a trigger fall here, not in D1)

Score: __/5

## D5 — Body quality (0-5)

For skills:

- [ ] Progressive disclosure — main body short; details linked to `references/`
- [ ] Concrete steps with example commands/code
- [ ] Output format documented for downstream consumers
- [ ] CI-integration section (where applicable)

For agents:

- [ ] When-invoked steps numbered and concrete
- [ ] Output format defined (table shape, JSON schema, markdown structure)
- [ ] At least 2 worked examples (typical case + edge case)
- [ ] Body 30-60 lines (per framework guidance)

Score: __/5

## D6 — Terminology compliance (0-5) — HARD REJECT IF 0

- [ ] ISTQB-canonical terms (verification, validation, defect, bug, fault,
      error, regression, smoke, sanity, acceptance, etc.) cited to
      [glossary.istqb.org](https://glossary.istqb.org/)
- [ ] Practitioner-emergent terms (flaky test, contract test, golden file,
      etc.) attributed to industry-engineering sources (Google Testing
      Blog, Pact docs, etc.) — never to ISTQB
- [ ] Tool-specific claims (commands, flags, config fields) grounded in
      fetched canonical source
- [ ] Source URL cited inline at point of claim, not as a "References:" appendix
- [ ] Reviewer spot-checks 2-3 claims against the cited URL — no contradiction

Score: __/5 — **0 = hard reject regardless of total**

## Total

Sum: __/30 — must be >= 21 to merge.

## Two-evaluator rule

- Two reviewers score independently.
- If totals differ by more than 2 points: walk the exemplars together, then
  re-score.
- If a single dimension score differs by more than 2 points: discuss the
  rubric line items for that dimension.

## Rejection examples

If you see any of these, request changes (don't merge):

- Generic best-practices prose not grounded in any cited source
- Tool commands reproduced from training data that drift vs. current docs
- `References:` list at bottom without inline citations
- Agent body > 80 lines (move details to a preloaded skill)
- Skill body without progressive disclosure (everything inline)
- Description that is a marketing tagline rather than a behavioral spec
- Persona-shaped scope with no trigger condition (D4 ≤ 1). The PR doesn't
  name nearest neighbors or articulate a differentiation axis — see the
  Differentiation requirement in [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Calibration

When in doubt, walk through these calibration anchors:

- **A-grade exemplar (28-30/30):** a skill that uses progressive
  disclosure (short main body + linked references), draws every concrete
  claim from a fetched canonical source, cites URLs inline at point of
  claim, names ISTQB-canonical terminology accurately, and ships at least
  one worked example. Anthropic's official `webapp-testing` skill is the
  reference shape.
- **C-grade exemplar (16-20/30):** a skill that scaffolds tooling but
  doesn't actually walk the user through running, parsing, or gating —
  weak D5. The body reads like a setup README rather than a workflow.
- **F-grade exemplar (<16/30):** a persona-shaped agent — vague
  description ("expert in all aspects of X"), no archetype fit, no
  trigger condition, no concrete output shape. Reject and ask the
  contributor to reshape into a sharp, task-scoped component with a
  documented differentiation axis vs. its nearest existing neighbors.
