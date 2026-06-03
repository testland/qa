# qa-roles Org-Chart Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `qa-roles` into a comprehensive 14-role QA org chart by moving 4 existing role agents in, authoring 7 new gap-filler role agents, and rewiring every reference.

**Architecture:** All work is in the `testland-qa` repo on branch `qa-roles-org-chart`. Agents are markdown files validated by the repo's gate scripts (the gate *is* the test suite). Work proceeds in phases: baseline → moves+reference-rewrites → new agents → README org chart + manifests + catalog regen + final verification.

**Tech Stack:** Markdown agents, JSON manifests (`plugin.json`, `marketplace.json`), Python/Bash validation scripts (`validate.py`, `rating-check.sh`, `content-audit.py`, `composition-graph.py`, `generate-catalog.py`), Node sync (`testland-web/scripts/sync-plugins.mjs`).

**Spec:** `docs/superpowers/specs/2026-06-03-qa-roles-org-chart-design.md`

---

## File Structure

**Moved into `plugins/qa-roles/agents/` (from elsewhere):**
- `data-quality-engineer.md` (from `qa-data-quality`)
- `production-tester.md` (from `qa-shift-right`)
- `exploratory-charter-author.md` (from `qa-manual-testing`)
- `test-quality-coach.md` (from `qa-process`)

**Created in `plugins/qa-roles/agents/`:**
- `automation-harness-bootstrapper.md`
- `load-test-plan-designer.md`
- `security-test-plan-builder.md`
- `a11y-manual-test-scripter.md`
- `test-effort-estimator.md`
- `release-cutover-coordinator.md`
- `qa-manager.md`

**Modified:**
- `plugins/qa-roles/.claude-plugin/plugin.json` + `README.md`
- `plugins/{qa-data-quality,qa-shift-right,qa-manual-testing,qa-process}/.claude-plugin/plugin.json` + `README.md`
- `.claude-plugin/marketplace.json` (5 plugin entries)
- Inbound cross-references in ~28 `.md` files (`docs/CONTRIBUTING.md`, `docs/COMPOSITION.md`, sibling agent/skill hand-off links)
- `CATALOG.md`, `COMPOSITION.md` (regenerated)
- Root `C:/GitHub/CLAUDE.md` exemplar pointer; workspace memory note for qa-roles

---

## Phase 0 — Baseline

### Task 0: Confirm a clean baseline before any change

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch**

Run: `cd /c/GitHub/testland-qa && git rev-parse --abbrev-ref HEAD`
Expected: `qa-roles-org-chart`

- [ ] **Step 2: Run the full gate on the untouched tree**

Run:
```bash
python3 scripts/validate.py . && bash scripts/rating-check.sh . && python3 scripts/content-audit.py --strict && python3 scripts/composition-graph.py
```
Expected: all exit 0 (this is the green baseline; if anything fails now, stop and report — it is pre-existing, not from this work).

- [ ] **Step 3: Record the current catalog state**

Run: `python3 scripts/generate-catalog.py && git status --short`
Expected: `CATALOG.md`/`COMPOSITION.md` unchanged (already current). If they change, commit the regen first as a separate housekeeping commit so later diffs are clean.

---

## Phase 1 — Move the 4 existing role agents

> Note on link depth: a moved file keeps the same `plugins/*/agents/` depth, so `../../<other-plugin>/...` links **inside** the moved file stay valid. Only links **pointing at** the moved file (from other files) change.

### Task 1: Move `data-quality-engineer` into qa-roles

**Files:**
- Move: `plugins/qa-data-quality/agents/data-quality-engineer.md` → `plugins/qa-roles/agents/data-quality-engineer.md`
- Modify: `plugins/qa-data-quality/.claude-plugin/plugin.json`, `plugins/qa-data-quality/README.md`, `.claude-plugin/marketplace.json`
- Modify (inbound refs): any file under `plugins/` and `docs/` linking `../../qa-data-quality/agents/data-quality-engineer.md` or naming it

- [ ] **Step 1: Move the file with git**

Run: `git mv plugins/qa-data-quality/agents/data-quality-engineer.md plugins/qa-roles/agents/data-quality-engineer.md`

- [ ] **Step 2: Check the moved file's own outbound links still resolve**

Run: `grep -n "](\.\./\.\./" plugins/qa-roles/agents/data-quality-engineer.md`
For each hit, confirm the target path exists from the new location (same depth, so cross-plugin links are unchanged; only fix a link if it pointed *within* qa-data-quality using a shallower path).

- [ ] **Step 3: Find inbound references**

Run: `grep -rln "data-quality-engineer" plugins docs --include=*.md`
Expected hits include `plugins/qa-data-quality/README.md`, `docs/CONTRIBUTING.md`, `docs/COMPOSITION.md`, possibly sibling agents.

- [ ] **Step 4: Rewrite each inbound link path**

For every markdown link of the form `](../../qa-data-quality/agents/data-quality-engineer.md)` change the plugin segment to `qa-roles`: `](../../qa-roles/agents/data-quality-engineer.md)`. Leave prose mentions of the name as-is unless they assert the wrong home plugin.

- [ ] **Step 5: Update qa-data-quality manifests (remove the agent)**

In `plugins/qa-data-quality/.claude-plugin/plugin.json` and the `qa-data-quality` entry in `.claude-plugin/marketplace.json`, change "3 agents (schema-diff-reviewer, data-anomaly-triager, data-quality-engineer)" → "2 agents (schema-diff-reviewer, data-anomaly-triager)". Mirror the same edit in `plugins/qa-data-quality/README.md` component table (delete the data-quality-engineer row).

- [ ] **Step 6: Run the structural gate**

Run: `python3 scripts/validate.py . && python3 scripts/composition-graph.py`
Expected: exit 0. (composition-graph must still resolve any `skills:` the moved agent preloads — those skills stayed in qa-data-quality and remain in the marketplace.)

- [ ] **Step 7: Commit**

```bash
git add plugins/qa-data-quality plugins/qa-roles/agents/data-quality-engineer.md .claude-plugin/marketplace.json docs
git commit -m "refactor(qa-roles): move data-quality-engineer from qa-data-quality

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 2: Move `production-tester` into qa-roles

**Files:**
- Move: `plugins/qa-shift-right/agents/production-tester.md` → `plugins/qa-roles/agents/production-tester.md`
- Modify: `plugins/qa-shift-right/.claude-plugin/plugin.json`, `plugins/qa-shift-right/README.md`, `.claude-plugin/marketplace.json`, inbound refs

- [ ] **Step 1: Move the file**

Run: `git mv plugins/qa-shift-right/agents/production-tester.md plugins/qa-roles/agents/production-tester.md`

- [ ] **Step 2: Find inbound references**

Run: `grep -rln "production-tester" plugins docs --include=*.md`
Known hits: `plugins/qa-shift-right/README.md`, `plugins/qa-shift-right/agents/observability-to-test.md`, `plugins/qa-shift-right/skills/synthetic-monitor-author/SKILL.md`, `plugins/qa-roles/agents/quality-coach.md`, `docs/COMPOSITION.md`.

- [ ] **Step 3: Rewrite inbound link paths**

Change `](../../qa-shift-right/agents/production-tester.md)` → `](../../qa-roles/agents/production-tester.md)` in every hit. For links *within* qa-shift-right that used `../agents/production-tester.md`, repoint to `../../qa-roles/agents/production-tester.md`.

- [ ] **Step 4: Update qa-shift-right manifests + README**

Remove `production-tester` from the agent enumeration/count in `plugin.json`, the `marketplace.json` entry, and the README component table.

- [ ] **Step 5: Run the structural gate**

Run: `python3 scripts/validate.py . && python3 scripts/composition-graph.py`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add plugins/qa-shift-right plugins/qa-roles/agents/production-tester.md plugins/qa-roles/agents/quality-coach.md .claude-plugin/marketplace.json docs
git commit -m "refactor(qa-roles): move production-tester from qa-shift-right

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 3: Move `exploratory-charter-author` into qa-roles

**Files:**
- Move: `plugins/qa-manual-testing/agents/exploratory-charter-author.md` → `plugins/qa-roles/agents/exploratory-charter-author.md`
- Modify: `plugins/qa-manual-testing/.claude-plugin/plugin.json`, `plugins/qa-manual-testing/README.md`, `.claude-plugin/marketplace.json`, inbound refs

- [ ] **Step 1: Move the file**

Run: `git mv plugins/qa-manual-testing/agents/exploratory-charter-author.md plugins/qa-roles/agents/exploratory-charter-author.md`

- [ ] **Step 2: Verify qa-manual-testing tolerates being agent-less**

Run: `ls plugins/qa-manual-testing/agents/ 2>/dev/null; python3 scripts/validate.py plugins/qa-manual-testing`
Expected: exit 0. If validate.py errors on an empty/absent `agents/` dir, add `plugins/qa-manual-testing/agents/.gitkeep` and re-run. (Pitfall from repo CLAUDE.md: empty dirs need `.gitkeep`.)

- [ ] **Step 3: Find + rewrite inbound references**

Run: `grep -rln "exploratory-charter-author" plugins docs --include=*.md`
Known hits include several `qa-manual-testing/skills/*/SKILL.md`, `plugins/qa-manual-testing/README.md`, `docs/COMPOSITION.md`. Rewrite link paths `](../../qa-manual-testing/agents/exploratory-charter-author.md)` and `](../agents/exploratory-charter-author.md)` → `](../../qa-roles/agents/exploratory-charter-author.md)`.

- [ ] **Step 4: Update qa-manual-testing manifests + README**

Remove the agent line/count (becomes "skills-only") in `plugin.json`, `marketplace.json` entry, README table.

- [ ] **Step 5: Run the structural gate**

Run: `python3 scripts/validate.py . && python3 scripts/composition-graph.py`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add plugins/qa-manual-testing plugins/qa-roles/agents/exploratory-charter-author.md .claude-plugin/marketplace.json docs
git commit -m "refactor(qa-roles): move exploratory-charter-author from qa-manual-testing

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 4: Move `test-quality-coach` into qa-roles + disambiguate from quality-coach

**Files:**
- Move: `plugins/qa-process/agents/test-quality-coach.md` → `plugins/qa-roles/agents/test-quality-coach.md`
- Modify: `plugins/qa-process/.claude-plugin/plugin.json`, `plugins/qa-process/README.md`, `.claude-plugin/marketplace.json`, inbound refs, and `plugins/qa-roles/agents/test-quality-coach.md` description if it overlaps quality-coach

- [ ] **Step 1: Move the file**

Run: `git mv plugins/qa-process/agents/test-quality-coach.md plugins/qa-roles/agents/test-quality-coach.md`

- [ ] **Step 2: Find + rewrite inbound references**

Run: `grep -rln "test-quality-coach" plugins docs --include=*.md`
Known hits: `plugins/qa-process/README.md`, `plugins/qa-process/skills/heuristic-test-design-coach/SKILL.md`, `plugins/qa-process/skills/test-case-from-live-feature/SKILL.md`, `plugins/qa-roles/agents/quality-coach.md` (its "broader test-quality coaching" hand-off note), `docs/COMPOSITION.md`. Rewrite link paths to `../../qa-roles/agents/test-quality-coach.md`.

- [ ] **Step 3: Confirm the two coach descriptions do not overlap**

Read both `plugins/qa-roles/agents/quality-coach.md` and `plugins/qa-roles/agents/test-quality-coach.md` frontmatter. `quality-coach` must read as **DoD-adherence enforcement on a PR/story**; `test-quality-coach` must read as **coaching on test-design quality (heuristics, coverage thinking)**. If either description blurs into the other, edit the weaker one so the differentiation axis is explicit. Update the cross-link in quality-coach.md that previously said test-quality-coach was "planned in qa-process" — it now lives here.

- [ ] **Step 4: Update qa-process manifests + README**

Remove `test-quality-coach` from the agent enumeration/count in `plugin.json`, `marketplace.json` entry, README table.

- [ ] **Step 5: Run the structural gate**

Run: `python3 scripts/validate.py . && python3 scripts/composition-graph.py`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add plugins/qa-process plugins/qa-roles/agents/test-quality-coach.md plugins/qa-roles/agents/quality-coach.md .claude-plugin/marketplace.json docs
git commit -m "refactor(qa-roles): move test-quality-coach from qa-process

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Author the 7 new role agents

> Each new agent uses the existing qa-roles body shape: opening line → `## When invoked` (modes/steps) → `## Output format` → `## Refuse-to-proceed rules` (if action-taking) → `## Anti-patterns` → `## Limitations` → `## Hand-off targets` → `## References`. Every concrete claim, threshold, command, or term **must** carry an inline citation to a source fetched at authoring time (d6 ≥ 1; d6 = 0 hard-rejects). Self-score `rating` honestly (merge bar 21). Commit message records source-fetch date per `docs/CONTRIBUTING.md`.

> Shared acceptance gate for every Task 5–11, run before its commit:
> `python3 scripts/validate.py . && bash scripts/rating-check.sh . && python3 scripts/content-audit.py --strict && python3 scripts/composition-graph.py` → all exit 0.

### Task 5: `automation-harness-bootstrapper`

**Files:** Create `plugins/qa-roles/agents/automation-harness-bootstrapper.md`

- [ ] **Step 1: Fetch sources**

Fetch and take notes (for inline citation): Martin Fowler "PageObject" (martinfowler.com/bliki/PageObject.html); SeleniumHQ "Page object models" (selenium.dev/documentation/test_practices/encouraged/page_object_models/); Playwright "Test configuration" + "Page object models" (playwright.dev); Cypress "Project structure". Note the date.

- [ ] **Step 2: Write the agent file**

Frontmatter (exact):
```yaml
---
name: automation-harness-bootstrapper
description: "Scaffolds a test-automation framework skeleton for a repo that has none - given the app's stack and entry points, generates the folder layout, base fixtures, a page-object (or screenplay) base class, one example smoke test, and the CI job that runs it. Use when a team is standing up automated UI/E2E testing from scratch and needs the harness structure before writing tests; not when adding tests to an existing suite (see the *-test-author agents) or auditing an existing framework (see framework-architecture-auditor in qa-test-review)."
tools: "Read, Grep, Glob, Write, Bash(npx playwright *), Bash(npm init *)"
model: sonnet
rating: 22
d6: 3
---
```
Body sections: `## When invoked` (inputs: stack, app entry URL/command, runner choice); `## Step 1 - Detect stack & choose layout`; `## Step 2 - Emit folder skeleton` (concrete tree); `## Step 3 - Base fixtures + page-object base` (code block, cited to Page Object source); `## Step 4 - One example smoke test`; `## Step 5 - CI job` (cited to Playwright CI docs); `## Output format`; `## Anti-patterns` (e.g. "scaffolds tests, not just folders" boundary vs *-test-author); `## Limitations`; `## Hand-off targets` (→ the per-language `*-test-author` agents to write real tests); `## References` (mirrors of the inline citations).

- [ ] **Step 3: Run the shared acceptance gate** (see Phase 2 header) → all exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/agents/automation-harness-bootstrapper.md
git commit -m "feat(qa-roles): add automation-harness-bootstrapper (SDET role; sources fetched 2026-06-03)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 6: `load-test-plan-designer`

**Files:** Create `plugins/qa-roles/agents/load-test-plan-designer.md`

- [ ] **Step 1: Fetch sources**

k6 "Test types" + "Thresholds" (grafana.com/docs/k6); Gatling "Injection profiles" (docs.gatling.io); Google SRE Workbook "Implementing SLOs" / error budgets (sre.google/workbook). Note date.

- [ ] **Step 2: Write the agent file**

Frontmatter (exact):
```yaml
---
name: load-test-plan-designer
description: "Designs a load-test plan from a service's SLOs and endpoint inventory - maps each SLO to load scenarios, defines ramp / soak / spike profiles, sets pass/fail threshold expressions, and outputs a tool-agnostic plan ready to implement in k6 or Gatling. Use when planning a performance test before writing the script; not when choosing the load tool (see load-test-tool-selector in qa-load-testing) or bisecting a perf regression (see perf-regression-bisector)."
tools: "Read, Grep, Glob"
model: sonnet
rating: 22
d6: 3
---
```
Body: `## When invoked` (inputs: SLO doc/targets, endpoint list, expected traffic); `## Step 1 - Derive scenarios from SLOs`; `## Step 2 - Choose load profiles` (ramp/soak/spike table cited to k6 test-types); `## Step 3 - Threshold expressions` (cited to k6 Thresholds); `## Step 4 - Error-budget framing` (cited to SRE workbook); `## Output format` (the plan doc); `## Anti-patterns`; `## Limitations`; `## Hand-off targets` (→ load-test-tool-selector to implement); `## References`.

- [ ] **Step 3: Run the shared acceptance gate** → all exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/agents/load-test-plan-designer.md
git commit -m "feat(qa-roles): add load-test-plan-designer (Performance Engineer role; sources fetched 2026-06-03)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 7: `security-test-plan-builder`

**Files:** Create `plugins/qa-roles/agents/security-test-plan-builder.md`

- [ ] **Step 1: Fetch sources**

OWASP ASVS v4.0.3 (owasp.org/www-project-application-security-verification-standard); OWASP Web Security Testing Guide (owasp.org/www-project-web-security-testing-guide); OWASP Top 10 2021 (owasp.org/Top10). Note date.

- [ ] **Step 2: Write the agent file**

Frontmatter (exact):
```yaml
---
name: security-test-plan-builder
description: "Builds a per-PR security test checklist from a change's attack surface - reads the diff, maps touched surfaces (authentication, input handling, file upload, deserialization, access control) to the relevant OWASP ASVS verification requirements and Top 10 categories, and emits a targeted manual + automated security test list. Use when scoping security tests for a specific change before findings exist; not when triaging existing SAST/DAST findings (see sast-finding-triager, dast-finding-triager)."
tools: "Read, Grep, Glob, Bash(git diff *), Bash(git log *)"
model: sonnet
rating: 22
d6: 4
---
```
Body: `## When invoked`; `## Step 1 - Map the diff to attack surfaces`; `## Step 2 - Surface → ASVS requirement table` (cited to ASVS chapters); `## Step 3 - Top-10 category tagging` (cited); `## Step 4 - Emit test checklist`; `## Output format`; `## Refuse-to-proceed rules` (won't sign off security; produces tests only); `## Anti-patterns`; `## Limitations`; `## Hand-off targets` (→ dast/sast triagers once tests run); `## References`.

- [ ] **Step 3: Run the shared acceptance gate** → all exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/agents/security-test-plan-builder.md
git commit -m "feat(qa-roles): add security-test-plan-builder (AppSec role; sources fetched 2026-06-03)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 8: `a11y-manual-test-scripter`

**Files:** Create `plugins/qa-roles/agents/a11y-manual-test-scripter.md`

- [ ] **Step 1: Fetch sources**

WCAG 2.2 (w3.org/TR/WCAG22/); WAI-ARIA Authoring Practices Guide patterns (w3.org/WAI/ARIA/apg/); WebAIM keyboard-testing + screen-reader testing notes (webaim.org). Note date.

- [ ] **Step 2: Write the agent file**

Frontmatter (exact):
```yaml
---
name: a11y-manual-test-scripter
description: "Produces a manual accessibility test script for a component or page - generates step-by-step keyboard-navigation and screen-reader (NVDA / VoiceOver) test cases mapped to specific WCAG 2.2 success criteria, with expected focus order and announcements. Use when a human needs to manually verify accessibility beyond automated checks; not when statically reviewing code for a11y issues (see accessibility-code-critic in qa-accessibility-specifics)."
tools: "Read, Grep, Glob"
model: sonnet
rating: 22
d6: 4
---
```
Body: `## When invoked`; `## Step 1 - Identify interactive elements & roles`; `## Step 2 - Keyboard test cases` (cited to APG keyboard interaction); `## Step 3 - Screen-reader test cases` (NVDA/VoiceOver expected announcements); `## Step 4 - Map each case to a WCAG 2.2 SC` (cited); `## Output format` (numbered manual script with expected results); `## Anti-patterns` (manual scripting, not automated axe scan); `## Limitations`; `## Hand-off targets` (→ accessibility-code-critic for code-level fixes); `## References`.

- [ ] **Step 3: Run the shared acceptance gate** → all exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/agents/a11y-manual-test-scripter.md
git commit -m "feat(qa-roles): add a11y-manual-test-scripter (Accessibility Specialist role; sources fetched 2026-06-03)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 9: `test-effort-estimator`

**Files:** Create `plugins/qa-roles/agents/test-effort-estimator.md`

- [ ] **Step 1: Fetch sources**

ISTQB CTAL Test Manager syllabus (estimation techniques) (istqb.org); ISO/IEC/IEEE 29119-2 (test process / planning) overview; Mike Cohn test-pyramid for layer split (martinfowler.com/bliki/TestPyramid.html, reuse). Note date.

- [ ] **Step 2: Write the agent file**

Frontmatter (exact):
```yaml
---
name: test-effort-estimator
description: "Estimates testing effort for an epic and proposes an ownership split - given the epic's stories and change shape, classifies test work by layer and risk, produces a per-area effort estimate with stated assumptions, and recommends who-tests-what across the team. Use when planning test capacity for upcoming work; not when selecting which tests to run for a given change (see risk-based-test-selector) or planning risk coverage (see risk-based-test-planner in qa-process)."
tools: "Read, Grep, Glob, Bash(git log *), Bash(git diff *)"
model: sonnet
rating: 22
d6: 3
---
```
Body: `## When invoked`; `## Step 1 - Decompose epic into testable areas`; `## Step 2 - Classify by layer & risk` (cited to ISTQB estimation + pyramid); `## Step 3 - Effort estimate with assumptions` (explicit assumption ledger); `## Step 4 - Ownership split recommendation`; `## Output format`; `## Anti-patterns` (estimate ≠ commitment; no estimation without stated assumptions); `## Limitations`; `## Hand-off targets` (→ risk-based-test-planner for risk coverage); `## References`.

- [ ] **Step 3: Run the shared acceptance gate** → all exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/agents/test-effort-estimator.md
git commit -m "feat(qa-roles): add test-effort-estimator (QA/Test Lead role; sources fetched 2026-06-03)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 10: `release-cutover-coordinator`

**Files:** Create `plugins/qa-roles/agents/release-cutover-coordinator.md`

- [ ] **Step 1: Fetch sources**

Humble & Farley *Continuous Delivery* (cite by ISBN 978-0321601919, deployment/cutover patterns); Martin Fowler "BlueGreenDeployment" (martinfowler.com/bliki/BlueGreenDeployment.html); Google SRE book "Release Engineering" chapter (sre.google/sre-book/release-engineering/). Note date.

- [ ] **Step 2: Write the agent file**

Frontmatter (exact):
```yaml
---
name: release-cutover-coordinator
description: "Coordinates a multi-team release cutover - builds the go/no-go checklist for a release window, sequences cross-team dependencies and gates, assigns owners and timeboxes per step, and produces the cutover runbook with explicit rollback decision points. Use for org-level release coordination across teams; not for executing a single service's release runbook (see release-engineer) or the upstream readiness gate (see release-readiness-checker in qa-process)."
tools: "Read, Grep, Glob, Bash(gh issue list *), Bash(gh pr list *)"
model: sonnet
rating: 23
d6: 3
---
```
Body: `## When invoked`; `## Step 1 - Inventory participating teams & dependencies`; `## Step 2 - Sequence the cutover` (ordered gates, cited to CD/Release Engineering); `## Step 3 - Owners + timeboxes`; `## Step 4 - Rollback decision points` (cited to BlueGreen); `## Output format` (cutover runbook); `## Refuse-to-proceed rules` (never auto-advances a gate; human go/no-go); `## Anti-patterns`; `## Limitations`; `## Hand-off targets` (→ release-engineer per service); `## References`.

- [ ] **Step 3: Run the shared acceptance gate** → all exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/agents/release-cutover-coordinator.md
git commit -m "feat(qa-roles): add release-cutover-coordinator (Release Manager role; sources fetched 2026-06-03)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 11: `qa-manager`

**Files:** Create `plugins/qa-roles/agents/qa-manager.md`

- [ ] **Step 1: Fetch sources**

DORA "Four keys" metrics (dora.dev) + Accelerate (cite by ISBN 978-1942788331); ISTQB Test Manager on quality metrics/reporting (istqb.org); the repo's own escape-defect concept (cross-ref escape-defect-analyzer in qa-bug-repro). Note date.

- [ ] **Step 2: Write the agent file**

Frontmatter (exact):
```yaml
---
name: qa-manager
description: "Generates a weekly quality-status digest for a QA manager - reads CI run history, the defect tracker, and flake-quarantine state, computes pass-rate trend, escape-defect rate, and flake debt, and emits a one-page red / amber / green status per area. Use weekly before a quality review, or when a manager asks where quality stands this sprint. Composes existing signals into a status doc; does not itself run tests or triage defects."
tools: "Read, Grep, Glob, Bash(gh run list *), Bash(gh issue list *)"
model: sonnet
rating: 22
d6: 3
---
```
Body: `## When invoked`; `## Step 1 - Gather inputs` (CI history, defect tracker, quarantine list); `## Step 2 - Compute metrics` (pass-rate trend, escape-defect rate cited to DORA/ISTQB, flake debt); `## Step 3 - RAG per area`; `## Output format` (one-page digest template); `## Anti-patterns` (digest ≠ vanity metrics; cite each number's source); `## Limitations`; `## Hand-off targets` (→ escape-defect-analyzer, flake-triage agents); `## References`.

- [ ] **Step 3: Run the shared acceptance gate** → all exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/agents/qa-manager.md
git commit -m "feat(qa-roles): add qa-manager (QA Manager role; sources fetched 2026-06-03)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Manifests, README org chart, catalog, finalize

### Task 12: Update qa-roles manifests to the full 14

**Files:** Modify `plugins/qa-roles/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (qa-roles entry)

- [ ] **Step 1: Rewrite the qa-roles plugin.json description**

Set `version` `1.0.0` → `1.1.0`. Rewrite `description` to enumerate the 14 agents grouped by tier (IC / Lead / Manager), dropping the old "(3)" framing. Keep it ≤1024 chars (content-audit enforces this).

- [ ] **Step 2: Rewrite the qa-roles marketplace.json entry**

Mirror the description; keep `category` as-is.

- [ ] **Step 3: Run content-audit + validate**

Run: `python3 scripts/content-audit.py --strict && python3 scripts/validate.py .`
Expected: exit 0 (catches a description over 1024 chars).

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(qa-roles): bump to v1.1.0 and enumerate 14 role agents

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 13: Rewrite the qa-roles README as the org chart

**Files:** Modify `plugins/qa-roles/README.md`

- [ ] **Step 1: Replace the Components table with a tiered org chart**

Three sub-tables (Tier 1 IC / Tier 2 Lead / Tier 3 Manager) listing the human **Role label → Agent → one-line task**, all 14 rows. Remove the old text that says role agents "live in" other plugins (no longer true for the moved four). Keep the Install + Rating sections.

- [ ] **Step 2: Verify every linked agent file exists**

Run: `grep -oE "agents/[a-z0-9-]+\.md" plugins/qa-roles/README.md | sort -u | while read f; do test -f "plugins/qa-roles/$f" || echo "MISSING: $f"; done`
Expected: no `MISSING` output.

- [ ] **Step 3: Run validate**

Run: `python3 scripts/validate.py .`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/qa-roles/README.md
git commit -m "docs(qa-roles): rewrite README as the 14-role QA org chart

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 14: Regenerate CATALOG.md + hand-update COMPOSITION.md

**Files:** Modify `CATALOG.md` (generated), `docs/COMPOSITION.md` (hand-maintained)

> CORRECTION (verified during execution): `generate-catalog.py` writes **only** `CATALOG.md`, sourced from `marketplace.json` + per-plugin manifests (so it reflects the Task 12 manifest edits, not the raw agent files). `composition-graph.py` does **not** write any file — it only validates and prints. `docs/COMPOSITION.md` is hand-maintained and already self-describes its per-plugin subsections as a non-backfilled snapshot, with the live validator as authoritative. So COMPOSITION.md gets targeted manual edits, not regen.

- [ ] **Step 1: Regenerate CATALOG.md**

Run: `python3 scripts/generate-catalog.py`
Expected: writes CATALOG.md; qa-roles shows 14 agents, the four source plugins show decreased counts (reflecting the Task 12 manifest edits).

- [ ] **Step 2: Hand-update COMPOSITION.md**

In `docs/COMPOSITION.md`, relocate the rows for the 4 moved agents from their old plugin subsection into the `### qa-roles` subsection:
- `data-quality-engineer` (from `### qa-data-quality`)
- `production-tester` (from `### qa-shift-right`)
- `exploratory-charter-author` (from `### qa-manual-testing`)
- `test-quality-coach` (from `### qa-process`)
Then fix the "Cross-plugin preload edges" row labelled `qa-process/test-quality-coach` → relabel to `qa-roles/test-quality-coach` (the preloaded skill `test-code-conventions` in qa-test-review is unchanged). Do not attempt a full backfill — the doc disclaims completeness; only fix what these moves made wrong. Update the header per-plugin counts only if trivially derivable.

- [ ] **Step 3: Sanity-check the diff**

Run: `git diff --stat CATALOG.md docs/COMPOSITION.md`
Expected: both touched; counts reconcile.

- [ ] **Step 4: Commit**

```bash
git add CATALOG.md docs/COMPOSITION.md
git commit -m "chore: refresh catalog + composition for qa-roles org chart

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 15: Update root CLAUDE.md exemplar pointer + memory note

**Files:** Modify `C:/GitHub/CLAUDE.md`; workspace memory file for the qa-roles "3 agents" note

- [ ] **Step 1: Fix the qa-data-quality exemplar pointer**

In `C:/GitHub/CLAUDE.md`, the "Where to look for examples" reference to `qa-data-quality` as "5 skills S1 + 3 agents A1/A2/A3" → "5 skills S1 + 2 agents". If qa-data-quality is no longer the cleanest multi-archetype example, point that row at another plugin (e.g. `qa-bug-repro`) and note why.

- [ ] **Step 2: Update the workspace memory note**

Read `C:/Users/Evgenii.Kosiakov/.claude/projects/C--GitHub/memory/MEMORY.md`; update any note recording qa-roles as "3 agents" to reflect the 14-role org chart (or add a project note: qa-roles is now the consolidated QA org chart; data-quality-engineer/production-tester/exploratory-charter-author/test-quality-coach relocated there).

- [ ] **Step 3: Commit (CLAUDE.md only; memory is not in this repo)**

```bash
git add ../CLAUDE.md 2>/dev/null || true
# Note: C:/GitHub/CLAUDE.md is in the workspace root, not testland-qa.
# Commit it from the workspace root if it is under version control there;
# otherwise leave as a working-tree edit and report it to the user.
```

### Task 16: Full gate + web sync dry-run + finish

**Files:** none (verification)

- [ ] **Step 1: Run the entire gate clean**

Run:
```bash
python3 scripts/validate.py . && bash scripts/rating-check.sh . && python3 scripts/content-audit.py --strict && python3 scripts/composition-graph.py && python3 scripts/generate-catalog.py && git status --short
```
Expected: all exit 0; `git status` clean (catalog already committed).

- [ ] **Step 2: Web sync dry-run**

Run: `cd /c/GitHub/testland-web && TESTLAND_QA_PATH=/c/GitHub/testland-qa node scripts/sync-plugins.mjs`
Expected: exits 0; `content/plugins/qa-roles/agents/` now contains 14 files. Spot-check `public/plugins-index.json` shows qa-roles with 14 agents.

- [ ] **Step 3: Confirm no broken inbound links remain**

Run: `cd /c/GitHub/testland-qa && grep -rln "qa-data-quality/agents/data-quality-engineer\|qa-shift-right/agents/production-tester\|qa-manual-testing/agents/exploratory-charter-author\|qa-process/agents/test-quality-coach" plugins docs --include=*.md`
Expected: no output (all inbound links repointed to qa-roles).

- [ ] **Step 4: Invoke finishing-a-development-branch**

Use `superpowers:finishing-a-development-branch` to decide merge/PR/cleanup for branch `qa-roles-org-chart`. Do not push without explicit user authorization (workspace rule: commit and push are separate steps).

---

## Self-Review

**Spec coverage:** Every spec section maps to tasks — roster (Phases 1–2), move mechanics (Tasks 1–4, Phase 3 manifests/catalog), new-agent authoring + sourcing (Tasks 5–11), coach disambiguation (Task 4 Step 3), exemplar pointer (Task 15), verification (Task 16). README org chart (Task 13). ✓

**Placeholder scan:** New-agent bodies are specified by exact frontmatter + required section list + named sources rather than full 200-line prose, because d6 requires citing sources fetched at authoring time — the body cannot be honestly pre-written before the fetch. This is intentional, not a placeholder; each task's acceptance gate (rating ≥21, d6 ≥1) enforces real content.

**Type/name consistency:** Agent names are identical across the roster table, frontmatter, commit messages, README links, and inbound-reference greps. The four moved-agent names match their grep patterns in Task 16 Step 3.

**Known soft spots flagged for the executor:** (a) `qa-manual-testing` becoming agent-less — Task 3 Step 2 verifies the lint tolerates it. (b) `composition-graph.py` semantics for moved agents' `skills:` preloads — verified in each move task's gate step. (c) root `CLAUDE.md` may live outside the testland-qa git repo — Task 15 Step 3 handles both cases.
