# qa-roles org-chart expansion — design

**Date:** 2026-06-03
**Status:** Draft for review
**Scope:** `testland-qa` only (one repo, multiple plugins)

## Problem

The `qa-roles` plugin (page `/plugins/qa-roles`) ships 3 agents and is
positioned as a minimal demonstrator of the "sharp task, not job-title
persona" pattern. The goal is to turn it into a **comprehensive QA org
chart**: a single plugin that hosts a recognizable role for every seat on
a QA team, so a visitor can find "their" role on one page.

## Decisions (from brainstorming)

1. **Comprehensive org chart** — aim for full role coverage (~14 roles),
   not a minimal exemplar set.
2. **Fill gaps AND consolidate** — author new role agents for uncovered
   seats, and **physically move** the role-shaped agents that currently
   live in other discipline plugins into `qa-roles`.
3. **Full move** — the user chose the full physical move after being shown
   the four consequences (taxonomy inversion, exemplar-plugin damage,
   persona-stretch risk, cross-reference churn). The move set is bounded to
   genuinely role/job-title-shaped agents, not every task agent.
4. **Hybrid, router-first naming** — role-titled names where the job title
   routes cleanly; task-titled names for new gap-fillers where a bare title
   would be too vague for delegation (per Anthropic subagent guidance: the
   `description` drives routing, so it must predict the body).

### Consequences accepted

Moving agents out of discipline plugins inverts the marketplace's
by-discipline taxonomy and hollows two documented exemplar plugins
(`qa-data-quality`, referenced in root `CLAUDE.md` as the "S1 wrappers +
multi-archetype agent set" example). The root `CLAUDE.md` exemplar pointer
and the relevant `MEMORY` note will be updated as part of this work.

## The roster (14 roles)

**KEEP** = already in qa-roles · **MOVE** = relocate existing agent ·
**NEW** = author from scratch.

### Tier 1 — Hands-on / IC

| Role | Agent | Action | Sharp task & differentiation |
|---|---|---|---|
| Manual & Exploratory Tester | `exploratory-charter-author` | MOVE (qa-manual-testing) | Builds a focused exploration charter (mission + areas + tactics). Already sharp. |
| SDET / Automation Engineer | `automation-harness-bootstrapper` | NEW | Scaffolds the framework skeleton (folder layout, fixtures, page-object base, CI wiring) for a repo with no automation. Differs from `*-test-author` (write tests) and `framework-architecture-auditor` (reviews an existing harness). |
| Performance Test Engineer | `load-test-plan-designer` | NEW | Turns an SLO + endpoint list into a load-test plan (scenarios, ramp profile, thresholds). Differs from `load-test-tool-selector` (picks the tool). |
| Security Tester / AppSec | `security-test-plan-builder` | NEW | Builds a per-PR security test checklist from the change's attack surface, OWASP-mapped. Differs from `sast-finding-triager` / `dast-finding-triager` (triage after findings exist). |
| Accessibility Specialist | `a11y-manual-test-scripter` | NEW | Produces a manual keyboard + screen-reader test script for a component/page. Differs from `accessibility-code-critic` (static code review). |
| Data Quality Engineer | `data-quality-engineer` | MOVE (qa-data-quality) | Already a role agent. |
| Production Tester | `production-tester` | MOVE (qa-shift-right) | Already a role agent. |

### Tier 2 — Lead / senior

| Role | Agent | Action | Sharp task & differentiation |
|---|---|---|---|
| Test Architect | `test-architect` | KEEP | Pyramid + framework recommendation per repo. |
| QA / Test Lead | `test-effort-estimator` | NEW | Given an epic + change shape, estimates test effort and proposes a who-tests-what ownership split. Differs from `risk-based-test-planner` (risk → test selection). |
| Quality Coach (DoD) | `quality-coach` | KEEP | Adversarial DoD-adherence reviewer. |
| Test Quality Coach | `test-quality-coach` | MOVE (qa-process) | Coaches on test-design quality. Axis vs `quality-coach`: design quality, not DoD adherence. |

### Tier 3 — Manager / release

| Role | Agent | Action | Sharp task & differentiation |
|---|---|---|---|
| Release Engineer | `release-engineer` | KEEP | One-release runbook + canary conductor. |
| Release Manager | `release-cutover-coordinator` | NEW | Cross-team go/no-go cutover checklist for a release window. Differs from `release-engineer` (executes one release) and `release-readiness-checker` (single upstream gate). |
| QA Manager | `qa-manager` | NEW | Weekly quality-status digest: pass-rate trend, escape-defect rate, flake debt → RAG one-pager. Differs from any single discipline agent (it composes metrics, doesn't produce them). |

Totals: **3 KEEP · 4 MOVE · 7 NEW = 14**.

## Move mechanics (per MOVE agent)

For each of `data-quality-engineer`, `production-tester`,
`exploratory-charter-author`, `test-quality-coach`:

1. Move `plugins/<src>/agents/<a>.md` → `plugins/qa-roles/agents/<a>.md`.
   Cross-plugin relative links in the body (`../../<other>/...`) stay valid
   because the file keeps the same `plugins/*/agents/` depth; only inbound
   links to the moved file change.
2. Edit the **source** `plugin.json` description and the source plugin's
   `marketplace.json` entry: remove the agent from the enumerated agent list
   and decrement the count.
3. Edit **qa-roles** `plugin.json` and its `marketplace.json` entry: add the
   moved agents; agent count 3 → 14.
4. Rewrite **inbound references** across the ~28 files that name the moved
   agents: hand-off links `../../<src>/agents/<a>.md` →
   `../../qa-roles/agents/<a>.md`, and prose mentions in READMEs /
   `CONTRIBUTING.md` / `COMPOSITION.md`.
5. Regenerate `CATALOG.md` and `COMPOSITION.md` via repo scripts.
6. Update root `CLAUDE.md` exemplar pointer (`qa-data-quality` now 2 agents)
   and the workspace memory note that records qa-roles as "3 agents."

Source plugins after the move:
- `qa-data-quality`: 5 skills + 2 agents (schema-diff-reviewer, data-anomaly-triager).
- `qa-shift-right`: keeps observability-to-test + its skills.
- `qa-manual-testing`: keeps its skill set; loses its only agent (becomes skills-only) — acceptable, verify lint allows agent-less plugin.
- `qa-process`: keeps its remaining agents (risk family, release-readiness-checker, test-case-quality-auditor).

## New-agent authoring (7)

Each NEW agent follows the existing qa-roles agent body shape:
When invoked → modes/steps → `## Output format` → Refuse-to-proceed rules →
Anti-patterns → Limitations → Hand-off targets → References. Each must clear
`rating ≥ 21` and `d6 ≥ 1` with **inline citations to fetched canonical
sources**. Source anchors per agent:

| New agent | Canonical sources to fetch |
|---|---|
| `automation-harness-bootstrapper` | Page Object / Screenplay (Fowler, SeleniumHQ), Playwright/Cypress project-structure docs |
| `load-test-plan-designer` | k6 / Gatling docs; Google SRE workbook (SLO/error budget) |
| `security-test-plan-builder` | OWASP ASVS, OWASP Testing Guide, OWASP Top 10 (2021) |
| `a11y-manual-test-scripter` | WCAG 2.2, W3C WAI-ARIA Authoring Practices Guide |
| `test-effort-estimator` | ISTQB Test Manager syllabus (estimation), ISO/IEC/IEEE 29119 |
| `release-cutover-coordinator` | Humble & Farley *Continuous Delivery*; Fowler on release; runbook patterns |
| `qa-manager` | DORA metrics (Accelerate / DORA reports), ISTQB on quality metrics |

Commit messages stamp source-fetch dates per `docs/CONTRIBUTING.md`.

## Coach disambiguation

`quality-coach` (KEEP) and `test-quality-coach` (MOVE) coexist. Axis must be
explicit in both descriptions: `quality-coach` = adversarial **DoD-adherence**
enforcement on a PR/story; `test-quality-coach` = coaching on **test-design
quality** (heuristics, coverage thinking). Verify the two descriptions read as
non-overlapping after the move; adjust wording if not.

## Verification

The repo's quality gate is the test suite (agents are markdown). Before
marking complete, all green:

```
bash scripts/validate.sh .
bash scripts/rating-check.sh .
python3 scripts/content-audit.py --strict
python3 scripts/composition-graph.py
python3 scripts/generate-catalog.py   # CATALOG + COMPOSITION current
```

Plus a `sync-plugins.mjs` dry run against `testland-web` to confirm the page
renders all 14 agents and no inbound link 404s.

## Out of scope

- No changes to other repos. testland-web picks up the new content via its
  build-time sync; no manual web edits.
- No relaxation of the rating gate or differentiation requirement — every
  new agent earns its place through the existing bar.
- Task agents that are not job-title roles (triagers, reviewers, selectors)
  stay in their discipline plugins.

## Open questions

None blocking. Naming and roster confirmed during brainstorming; the only
soft call is whether `qa-manual-testing` becoming skills-only is acceptable
(assumed yes; lint check will confirm).
