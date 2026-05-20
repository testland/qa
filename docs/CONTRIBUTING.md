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

## Quality gate (CI-enforced)

Every component ships with these YAML frontmatter fields:

```yaml
---
name: kebab-case-name           # 1-64 chars, no claude/anthropic reserved words
description: ...                # 3rd-person, action-oriented; not "You are.../I help..."
rating: 21                      # 0-30, importable bar is >=21 (v2.0 framework)
d6: 1                           # 0-5; D6 Terminology Compliance; d6 = 0 is hard reject
archetype: S1                   # S1-S4 (skills) or A1-A4 (agents)
---
```

CI runs three checks on every PR:

1. **`scripts/test-validate.sh`** — self-test of validate.sh against fixtures.
2. **`scripts/validate.sh`** — lint rules: kebab-case naming, no reserved
   words (`claude`/`anthropic`), no "You are.../I help..." openers (must be
   third-person, action-oriented), no placeholder strings, no empty command
   bodies, JSON syntax.
3. **`scripts/rating-check.sh`** — `rating >= 21` and `d6 >= 1` (where d6 is
   present); `d6 = 0` blocks merge regardless of total.

## The six rating dimensions (v2.0)

Score each 0-5; total >=21 to merge.

- **D1 — Spec compliance:** does the frontmatter follow Anthropic's official
  Claude Code plugin spec (name, description, tools, allowed-tools,
  disable-model-invocation, skills preload, etc.)?
- **D2 — Archetype fit:** does it cleanly match S1-S4 (skills) or A1-A4
  (agents)? See [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md) for archetype
  definitions.
- **D3 — Description quality:** passes the single-description test (below)?
- **D4 — Use-case fit:** is the trigger clear and non-overlapping with
  neighbors?
- **D5 — Body quality:** progressive disclosure, concrete steps, examples,
  output format?
- **D6 — Terminology compliance:** ISTQB-canonical terms cited to canonical
  sources; tool-specific claims grounded in fetched vendor docs;
  practitioner-emergent terms (flaky test, contract test, golden file)
  attributed to industry-engineering sources, not ISTQB.

The full per-dimension rubric and review questions live in
[`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md).

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

3. **Fetch canonical sources** for every concrete claim. The standard
   anchors are: the [ISTQB glossary](https://glossary.istqb.org/) for
   terminology; ISO 25010 / 29119 / IEEE 829 for standards-level concepts;
   the W3C WCAG 2.x specs for accessibility; OWASP for security; and the
   official vendor docs for any tool wrapped in a skill (Playwright,
   Cypress, k6, dbt, Pact, etc.). Cite URLs inline at the point of each
   claim — not as an appended References list.

4. **Self-rate** D1-D6 against the framework. Add `rating:` and `d6:` to
   frontmatter.

5. **Run CI locally:**

   ```bash
   bash scripts/test-validate.sh
   bash scripts/validate.sh
   bash scripts/rating-check.sh
   ```

6. **Commit** with a message that includes the source-fetch date, e.g.:

   ```
   Add k6-load-testing skill (S1, rated 27/30 [d6=5]; sources fetched 2026-05-15 from grafana.com/docs/k6)
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
3. **The rating bar** — total ≥ 21/30, d6 ≥ 1, per the framework in
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
