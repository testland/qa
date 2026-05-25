# Contributing to testland-qa

This is a multi-plugin Claude Code marketplace focused on QA. Every component
(skill or agent) goes through a quality gate before merging. This doc explains
the gate so contributions land cleanly.

## Before you start

1. **Check the existing plugin set** under `plugins/` to find the 2–3
   nearest neighbors to what you want to add. Every PR has to state how
   the new component differs from them — see "Differentiation requirement"
   below.
2. **Read [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md)** for the full
   step-by-step authoring guide.
3. **Read [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md)** for the rubric
   your PR will be scored against.

## Quality gate (CI-enforced + shadow-audited)

Every component ships with these YAML frontmatter fields:

```yaml
---
name: kebab-case-name           # 1-64 chars, no claude/anthropic reserved words
description: ...                # ≤1024 chars; 3rd-person, action-oriented; no "You are..." / "I help..."
rating: 28                      # 0-30 sub-total (D1+D2+D3+D4+D5+D6); script enforces ≥21
d6: 4                           # 0-5; D6 Terminology Compliance; d6=0 is hard reject
d7: 4                           # 0-5; D7 Evaluation Coverage (v3.0+); hard floor ≥1 after 2026-06-01
d8: 4                           # 0-5; D8 Best-Practices Adherence (v4.0+); hard floor ≥1 after 2026-07-01
archetype: S1                   # S1-S4 (skills) or A1-A4 (agents)
---
```

The v4.0 total `rating + d7 + d8` is the importable score (out of 40).

CI runs three checks on every PR:

1. **`scripts/test-validate.sh`** — self-test of validate.sh against fixtures.
2. **`scripts/validate.sh`** — lint rules: kebab-case naming, no reserved
   words (`claude`/`anthropic`), no "You are.../I help..." openers (must be
   third-person, action-oriented), no placeholder strings, no empty command
   bodies, JSON syntax.
3. **`scripts/rating-check.sh`** — `rating ∈ [21, 30]` and `d6 ≥ 1` (where
   d6 is present); `d6 = 0` blocks merge regardless of total.

**Shadow window:** the lint script currently enforces v2.0 thresholds
(rating ≥21 + d6 ≥1). v3.0 (d7) and v4.0 (d8) sub-scores are advisory
during the shadow launch. Hard floors `d7 ≥ 1` becomes enforced after
2026-06-01; `d8 ≥ 1` becomes enforced after 2026-07-01. Author against
v4.0 from day one — the shadow audit reports your full v4.0 score to
the marketplace-wide backfill priority list.

## The eight rating dimensions (v4.0)

Score each 0–5 per the framework at
[`elv1s42k-qa-research/qa-rating-framework-2026-05-25.md`](https://github.com/elv1s42/qa-research).
Total ≥28 of 40 to be importable under v4.0; v3.0 enforcement (≥21 of 30
on D1–D6 sub-total) is what the lint script actually checks during the
shadow window.

- **D1 — Spec compliance:** frontmatter follows Anthropic's plugin spec
  (name format + name matches parent dir + description ≤1024 chars +
  no XML tags + folder + body placement).
- **D2 — Scope quality:** archetype fit (S1–S4 / A1–A4); body length
  within the archetype band; progressive disclosure when approaching the
  band cap. See [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md) for archetype
  definitions and length bands.
- **D3 — Description quality:** passes the single-description test (below);
  for agents, includes a "Use when…" / "Use proactively" trigger; skill
  names prefer gerund form.
- **D4 — Use-case fit:** real triggers; differentiated from neighbors
  (Anthropic-bundled patterns set the bar, not aggregator-clone saturation).
- **D5 — Body quality:** progressive disclosure, concrete steps + examples,
  output format. For A1/A3 agents ≥120 lines: explicit `## Output format`
  section. No Windows-style paths in cited examples.
- **D6 — Terminology compliance:** ISTQB-canonical terms cited to canonical
  sources; tool-specific claims grounded in fetched vendor docs;
  practitioner-emergent terms (flaky test, contract test, golden file)
  attributed to industry-engineering sources, not ISTQB. **D6 = 0 hard
  rejects.**
- **D7 — Evaluation coverage** (v3.0+): ≥3 evals colocated at
  `agents/<name>/evals/evals.md`, multi-model targets, ≥1 adversarial,
  concrete pass conditions (string-match / behavioral check). **D7 = 0
  hard rejects** (after 2026-06-01).
- **D8 — Best-practices adherence** (v4.0+): five sub-checks against
  Anthropic's `agent-skills/best-practices` doc — concision (no
  over-explanation), degrees-of-freedom calibration, single-default
  discipline (no multi-option paralysis), workflow + feedback-loop
  literacy, path + script + MCP hygiene. **D8 = 0 hard rejects** (after
  2026-07-01).

The full per-dimension rubric and review questions live in
[`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md). The framework spec
lives in the [research repo](https://github.com/elv1s42/qa-research).

## The single-description test

Before scaffolding any component, its description (<= 1024 chars) must:

- Distinguishably identify the component vs. its 2-3 nearest neighbors.
- Predict for a third party what the body does.
- Be third-person, action-oriented (no "You are.../I help...").
- Avoid `and` joining two unrelated clauses (= two components).
- Avoid vague verbs like "helps with", "manages", "handles".

If any check fails, reshape the scope before authoring.

## Authoring workflow

1. **Scaffold** a new plugin (if needed):

   ```bash
   bash scripts/new-plugin.sh <name> "<description>" <primary-keyword>
   ```

2. **Add components** under `plugins/<name>/skills/<name>/SKILL.md` or
   `plugins/<name>/agents/<name>.md`. Copy from `templates/skill/SKILL.md.tmpl`
   or `templates/agent/agent.md.tmpl`.

3. **Build evals FIRST** (v4.0 / Anthropic-required). Before drafting any
   body content, author ≥3 evals at
   `plugins/<name>/agents/<agent>/evals/evals.md` with ≥1 adversarial case.
   The evals are the spec the body is written against. See
   [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md) Step 4 for the full
   evaluation-driven-development workflow.

4. **Fetch canonical sources** for every concrete claim. The standard
   anchors are: the [ISTQB glossary](https://glossary.istqb.org/) for
   terminology; ISO 25010 / 29119 / IEEE 829 for standards-level concepts;
   the W3C WCAG 2.x specs for accessibility; OWASP for security; and the
   official vendor docs for any tool wrapped in a skill (Playwright,
   Cypress, k6, dbt, Pact, etc.). Cite URLs inline at the point of each
   claim — not as an appended References list.

5. **Self-rate** D1–D8 against the v4.0 framework. Add `rating:`, `d6:`,
   `d7:`, `d8:` to frontmatter.

6. **Run CI locally:**

   ```bash
   bash scripts/test-validate.sh
   bash scripts/validate.sh
   bash scripts/rating-check.sh
   ```

7. **Commit** with a message that includes the source-fetch date and v4.0
   total, e.g.:

   ```
   Add k6-load-testing skill (S1, rated 35/40 [d6=5, d7=4, d8=4]; sources fetched 2026-05-25 from grafana.com/docs/k6)
   ```

   For components scored under v3.0 (no D8 yet), use the v3.0 format:

   ```
   Add foo-bar agent (A2, rated 30/35 [d6=4, d7=4]; sources fetched 2026-05-22 from ...)
   ```

## Anti-patterns the reviewer rejects

- Body content that contradicts the cited source.
- Citing a source that wasn't actually fetched (commit message must show
  fetch date; reviewer can verify against git log).
- Generic best-practices prose not grounded in any cited source.
- Tool-specific commands/flags reproduced from training data that have
  drifted vs. current docs.
- `References:` lists at the bottom without inline citations at the point
  of use.
- Persona-shaped scopes that can't name a trigger condition (descriptions
  like "expert in X" with no "Use when…" or no concrete output). The lint
  catches "You are…" / "I help…" openers, but reviewers also reject scopes
  whose body could be literally anything — see D4 in the rubric.

## Differentiation requirement

Every new component must articulate how it differs from its 2–3 nearest
neighbors (in this marketplace or the broader Claude Code ecosystem). The
PR description and the component's `description` field both have to make
that differentiation legible.

This requirement replaces the older "saturated cells" exclusion list. We
no longer block component categories by name. Instead, components are
admitted on the strength of three things:

1. **An explicit trigger condition** — the description includes a
   "Use when…" / "Use proactively after…" clause (per Anthropic's
   subagent and skill guidance: the description is what Claude uses to
   route, so it must predict the body).
2. **A documented differentiation axis** — the PR identifies the closest
   existing components and explains the axis on which the new one is
   distinguishable (tool, lifecycle stage, output shape, scope of inputs,
   archetype). "It's the same idea, but mine" is not an axis.
3. **The rating bar** — v4.0 importable bar is total ≥ 28/40 with d6 ≥ 1,
   d7 ≥ 1 (hard floor after 2026-06-01), d8 ≥ 1 (hard floor after
   2026-07-01); the lint script enforces v2.0 thresholds (rating ≥ 21/30 +
   d6 ≥ 1) during the shadow window. Per the framework in
   [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md).

What this changes vs. earlier policy:

- Component categories formerly listed as "saturated" (generic
  `code-reviewer`, `security-auditor`, `debugger`, `test-automator`,
  per-language testing bundles, generic threat-modeling tools, desktop /
  embedded / game / VR testing, generic security tool wrappers, generic
  WCAG umbrella skills) are **no longer blocked by category**. A
  differentiated contribution in any of these areas is admissible.
- Names like `qa-expert` / `quality-engineer` / `qa-engineer` are also
  no longer banned by `validate.sh`. They remain *bad names* because they
  rarely come with a trigger condition — but the reviewer judgment is in
  D3 / D4, not in a lint denylist.
- Sharply-scoped role names that ship with a specific trigger are fine
  and always have been (see existing `quality-coach`, `release-engineer`,
  `data-quality-engineer`, `iac-policy-checker`).

## Reviewer rubric

See [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md) for the two-evaluator
rule (<=2-pt divergence) and per-dimension review questions.
