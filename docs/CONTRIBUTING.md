# Contributing to testland-qa

This is a multi-plugin Claude Code marketplace focused on QA. Every component
(skill or agent) goes through a quality gate before merging. This doc explains
the gate so contributions land cleanly.

## Before you start

1. **Check the existing plugin set** under `plugins/` to avoid duplicating
   an in-flight plugin or proposing a component that already exists.
2. **Check the NOT-GAPS list below.** Several saturated cells (generic
   `code-reviewer`, `qa-expert`, `security-auditor`, `debugger`, persona
   role agents, per-language testing bundles, etc.) are intentional skips.
   PRs that try to add them are rejected unless they ship measured evidence
   that the saturation no longer holds.
3. **Read [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md)** for the full
   step-by-step authoring guide.
4. **Read [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md)** for the rubric
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
2. **`scripts/validate.sh`** — lint rules: kebab-case, no reserved words, no
   "You are.../I help..." openers, no generic role-agent names, no
   placeholder strings, no empty command bodies, JSON syntax.
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
- Generic role-agent names (`qa-expert`, `quality-engineer`,
  `qa-engineer`, `test-automator`, `qa-lead`, `qa-specialist`,
  `qa-pro`, `qa-master`) — `validate.sh` rejects these by name.

## NOT-GAPS — saturated cells we will not fill

These slots already have sufficient ecosystem coverage and adding another
near-clone is not valuable. PRs that try to fill them are rejected unless
they ship measured evidence that the saturation no longer holds.

| Slot | Why we skip |
|---|---|
| Generic `code-reviewer` agent | 12+ near-clones in the existing ecosystem |
| Generic `qa-expert` / `qa-engineer` / `quality-engineer` | Persona-as-scope; vague descriptions; rejected by `validate.sh` by name |
| Generic `security-auditor` / OWASP Top-10 wrapper | Saturated cell |
| Generic `debugger` agent | Saturated cell |
| Generic `test-automator` agent | Saturated cell |
| Generic TDD red/green/refactor coaches | Multiple existing well-rated implementations |
| Per-language unit testing pattern bundles (`python-testing-patterns`, etc.) | Saturated by existing language bundles |
| Per-framework one-shot E2E *agents* (Playwright-expert, Cypress-expert, Selenium-expert) | Already covered as agents in the ecosystem; the *skill* form is welcome under a web-E2E plugin |
| Generic AI code review | Saturated cell |
| Generic threat-modeling tool | Already well covered |
| Desktop apps (Electron, Qt, Windows native) | Niche audience |
| Embedded / IoT testing | Niche audience |
| Game / VR testing | Niche audience |
| Generic security tool wrappers (zap, burp, snyk, trivy, semgrep, gitleaks) | Saturated; differentiated security niches welcome under a dedicated plugin |
| Generic WCAG audit umbrella skill | Saturated at the umbrella level; atomic accessibility skills (keyboard, focus-trap, color-contrast, ARIA) are welcome |

If you believe a slot above should be re-opened, open an issue first with
the measured evidence (e.g., a refreshed ecosystem rating pass showing the
existing components have decayed below the importable bar).

## Reviewer rubric

See [`REVIEWER_CHECKLIST.md`](REVIEWER_CHECKLIST.md) for the two-evaluator
rule (<=2-pt divergence) and per-dimension review questions.
