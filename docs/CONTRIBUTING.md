# Contributing to testland-qa

This is a multi-plugin Claude Code marketplace focused on QA. Every component
(skill or agent) goes through a quality gate before merging. This doc explains
the gate so contributions land cleanly.

## Before you start

1. **Check the existing plugin set** under `plugins/` to find the 2-3
   nearest neighbors to what you want to add. Every PR has to state how
   the new component differs from them - see "Differentiation requirement"
   below.
2. **Read [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md)** for the full
   step-by-step authoring guide.
3. **Read [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md)** for the rubric
   your PR will be reviewed against.

## Quality gate

Every component's frontmatter carries these required YAML fields:

```yaml
---
name: kebab-case-name           # 1-64 chars, no claude/anthropic reserved words
description: ...                # ≤1024 chars; 3rd-person, action-oriented; no "You are..." / "I help..."
---
```

There is no `rating` / `d6` field. The D1-D6 rubric is applied at manual PR
review (see "The six review dimensions" below), not stored in frontmatter.

CI runs these checks on every PR:

1. **`scripts/ts/validate.test.ts`** - self-test of validate.sh against fixtures.
2. **`scripts/ts/validate.ts`** - frontmatter/file lint: kebab-case naming, no
   reserved words (`claude`/`anthropic`), no "You are.../I help..." openers,
   no placeholder strings, no empty command bodies, JSON syntax.
3. **`scripts/ts/content-audit.ts`** - description ≤1024 chars, body within the
   type cap (skill 600 / agent 350 lines), Windows-path hygiene.
4. **`scripts/ts/composition-graph.ts`** - every agent `skills:` preload resolves
   to a real skill.
5. **`scripts/ts/generate-catalog.ts`** - `CATALOG.md` is regenerated and current.

There is no automated rating gate. The six D1-D6 dimensions are a manual review
lens a reviewer applies to the PR diff via the
[`.github/pull_request_template.md`](../.github/pull_request_template.md)
checklist.

## The six review dimensions (D1-D6)

A reviewer applies each dimension to the PR diff. There is no stored score and
no rating field; the reviewer's judgment on the checklist decides the merge. D6
carries a hard floor (see below).

- **D1 - Spec compliance:** frontmatter follows Anthropic's plugin spec
  (name format + name matches parent dir + description ≤1024 chars +
  no XML tags + folder + body placement).
- **D2 - Scope quality:** one coherent scope the description predicts;
  single responsibility (no two-things-stapled-together); progressive
  disclosure; skill body under ~500 lines (Anthropic's SKILL.md guidance),
  agent body kept brief. See [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md) for
  the optional "common shapes" authoring aid.
- **D3 - Description quality:** passes the single-description test (below);
  for agents, includes a "Use when…" / "Use proactively" trigger; skill
  names prefer gerund form.
- **D4 - Use-case fit:** real triggers; differentiated from neighbors
  (Anthropic-bundled patterns set the bar, not aggregator-clone saturation).
- **D5 - Body quality:** progressive disclosure, concrete steps + examples,
  output format. For read-only/reviewer agents ≥120 lines: explicit
  `## Output format` section. No Windows-style paths in cited examples.
- **D6 - Terminology compliance:** ISTQB-canonical terms cited to canonical
  sources; tool-specific claims grounded in fetched vendor docs;
  practitioner-emergent terms (flaky test, contract test, golden file)
  attributed to industry-engineering sources, not ISTQB. Sources may sit
  inline or in a checked References/Sources section. **Facts with no canonical
  source anywhere are a hard reject.**

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
   npm run new-plugin -- <name> "<description>" <primary-keyword>
   ```

2. **Add components** under `plugins/<name>/skills/<name>/SKILL.md` or
   `plugins/<name>/agents/<name>.md`. Copy from `templates/skill/SKILL.md.tmpl`
   or `templates/agent/agent.md.tmpl`.

3. **Fetch canonical sources** for every concrete claim. The standard
   anchors are: the [ISTQB glossary](https://glossary.istqb.org/) for
   terminology; ISO 25010 / 29119 / IEEE 829 for standards-level concepts;
   the W3C WCAG 2.x specs for accessibility; OWASP for security; and the
   official vendor docs for any tool wrapped in a skill (Playwright,
   Cypress, k6, dbt, Pact, etc.). Cite each claim's source inline or in a
   checked References/Sources section - every claim must be verifiable.

4. **Self-check against D1-D6** - the reviewer applies the rubric to the PR;
   there is no stored score and no rating field.

5. **Run CI locally:**

   ```bash
   npm test
   npm run validate
   npm run audit
   ```

6. **Commit** with a message that includes the source-fetch date, e.g.:

   ```
   Add k6-load-testing skill (sources fetched 2026-05-25 from grafana.com/docs/k6)
   ```

## Role bundles

A **role bundle** (`qa-starter`, the `qa-role-*` family) is a dependency-only
plugin that installs a curated set of plugins in one command. A bundle PR is
**exempt from the D1-D6 review** - it ships no components - but it must
declare its members as **bare plugin-name strings** in `plugin.json`
`dependencies` (never `{name, version}` or `name@testland-qa`), ship a
**prose-only** README with no component-table rows, register
`"category": "role-bundles"`, and regenerate + commit `CATALOG.md`. See
[`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md#authoring-a-role-bundle-plugin-no-components)
for the full recipe.

## Anti-patterns the reviewer rejects

- Body content that contradicts the cited source.
- Citing a source that wasn't actually fetched (commit message must show
  fetch date; reviewer can verify against git log).
- Generic best-practices prose not grounded in any cited source.
- Tool-specific commands/flags reproduced from training data that have
  drifted vs. current docs.
- Facts with no canonical source anywhere - neither inline nor in a
  References/Sources section.
- Persona-shaped scopes that can't name a trigger condition (descriptions
  like "expert in X" with no "Use when…" or no concrete output). The lint
  catches "You are…" / "I help…" openers, but reviewers also reject scopes
  whose body could be literally anything - see D4 in the rubric.

## Differentiation requirement

Every new component must articulate how it differs from its 2-3 nearest
neighbors (in this marketplace or the broader Claude Code ecosystem). The
PR description and the component's `description` field both have to make
that differentiation legible.

This requirement replaces the older "saturated cells" exclusion list. We
no longer block component categories by name. Instead, components are
admitted on the strength of three things:

1. **An explicit trigger condition** - the description includes a
   "Use when…" / "Use proactively after…" clause (per Anthropic's
   subagent and skill guidance: the description is what Claude uses to
   route, so it must predict the body).
2. **A documented differentiation axis** - the PR identifies the closest
   existing components and explains the axis on which the new one is
   distinguishable (tool, lifecycle stage, output shape, scope of inputs).
   "It's the same idea, but mine" is not an axis.
3. **The review bar** - at manual PR review each D1-D6 dimension clears its
   anchor, with citations (D6) as the hard floor. There is no automated rating
   gate. Per the rubric in
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
  rarely come with a trigger condition - but the reviewer judgment is in
  D3 / D4, not in a lint denylist.
- Sharply-scoped role names that ship with a specific trigger are fine
  and always have been (see existing `quality-coach`, `release-engineer`,
  `data-quality-engineer`, `security-finding-triager`).

## Reviewer rubric

See [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md) for the two-evaluator
rule (<=2-pt divergence) and per-dimension review questions.
