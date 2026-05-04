# Contributing to testland-qa

This is a multi-plugin Claude Code marketplace focused on QA. Every component
(skill or agent) goes through a quality gate before merging. This doc explains
the gate so contributions land cleanly.

## Before you start

1. **Read the research.** Design history, frameworks, and gap analyses live
   in <https://github.com/elv1s42k/qa-research>. Start with `decisions.md`.
2. **Check `qa-coverage-matrix-2026-04-29.md` §6** to see if a plugin already
   exists in scope. Avoid duplicating an in-flight plugin.
3. **Check the master plan's §13 NOT-GAPS list** in
   `qa-implementation-plan-2026-05-02.md`. Several saturated cells (generic
   `code-reviewer`, `qa-expert`, `security-auditor`, `debugger`, etc.) are
   intentional skips and PRs that try to add them are rejected.

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

- **D1 — Spec compliance:** does it follow `official-requirements-2026-04-29.md`?
- **D2 — Archetype fit:** does it cleanly match S1-S4 / A1-A4?
- **D3 — Description quality:** passes the single-description test?
- **D4 — Use-case fit:** is the trigger clear and non-overlapping with neighbors?
- **D5 — Body quality:** progressive disclosure, concrete steps, examples?
- **D6 — Terminology compliance (NEW in v2.0):** ISTQB-canonical terms cited
  to canonical sources; tool-specific claims grounded in fetched docs.

See `qa-rating-framework-2026-04-30.md` in the research repo for the full
rubric and worked examples.

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

3. **Fetch canonical sources** for every concrete claim. The
   `qa-reliable-sources-2026-05-03.md` catalog (research repo) lists the
   ISTQB glossary, ISO standards, vendor docs, etc. Cite URLs inline at the
   point of each claim — not as an appended References list.

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
- Generic role-agent names (`qa-expert`, `quality-engineer`, etc.) — see
  `decisions.md` anti-pattern guard.

## Reviewer rubric

See `docs/REVIEWER_CHECKLIST.md` for the two-evaluator rule (<=2-pt
divergence) and per-dimension review questions.
