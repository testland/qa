# qa-test-review

Test code quality reviewers - agents specialized for **test files only**, not production code. Production-code reviewers are well-served by the broader ecosystem; test-code hygiene (AAA structure, assertion specificity, mocking anti-patterns, E2E selector quality) is its own discipline and gets its own reviewers here.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [test-code-conventions](skills/test-code-conventions/SKILL.md) | Pure-reference catalog (§1-§10): AAA structure, single-responsibility, naming, assertion specificity, mocking, fixture coupling, magic numbers, E2E selectors, web-first assertions, slow setup. The agents in this plugin cite back to it. |
| Skill | [object-model-patterns](skills/object-model-patterns/SKILL.md) | Architecture-tier catalog: Page Object Model (Fowler), Screenplay (Marcano/Palmer), Component Object, App Actions (Cypress), Service Object, Repository - canonical citations, when-to-use, anti-patterns per pattern. |
| Skill | [test-isolation-patterns](skills/test-isolation-patterns/SKILL.md) | Architecture-tier catalog: fixture scope, Meszaros four-phase pattern, Fresh-vs-Shared-Fixture (Fowler), DB isolation strategies (transaction-rollback / DB-per-worker / template-db / Testcontainers), parallel safety, cleanup discipline. |
| Skill | [test-step-design-patterns](skills/test-step-design-patterns/SKILL.md) | Architecture-tier catalog: FIRST principles (Martin), step granularity, abstraction layers (mechanical → page → business), step-extraction rule of three (Fowler), AAA / Given-When-Then mapping, declarative-vs-imperative phrasing. |
| Skill | [test-framework-blueprint](skills/test-framework-blueprint/SKILL.md) | Build-an-X workflow: seven steps from no test suite to a written framework blueprint (SUT inventory, runner choice, layout + fixture architecture, object-model decision, data + mocking wiring, CI matrix, conventions doc) plus an implementation order. Defers pattern detail to the sister catalogs; hands the blueprint to qa-roles/automation-harness-bootstrapper for scaffolding. |
| Agent | [test-code-critic](agents/test-code-critic.md) | Walks structure / naming / single-responsibility / magic-number / slow-setup violations (§1-§3, §6, §7, §10). Refuses to review production code. |
| Agent | [assertion-quality-reviewer](agents/assertion-quality-reviewer.md) | Rates each assertion as specific / narrow-vague / wide-vague / match-vague (§4). Recommends specific replacements. |
| Agent | [mocking-anti-pattern-detector](agents/mocking-anti-pattern-detector.md) | Flags over-mocking, behavior-verification leakage, mock chains, mocking-what-you-don't-own, and fake-candidate situations (§5). |
| Agent | [e2e-selector-quality-critic](agents/e2e-selector-quality-critic.md) | Flags brittle CSS class / nth-child / XPath selectors and non-web-first assertions; recommends `getByRole` / accessibility-first equivalents (§8, §9). |
| Agent | [framework-architecture-auditor](agents/framework-architecture-auditor.md) | Cross-file framework audit: POM consistency, base-class hierarchy depth, fixture coupling, helper sprawl, naming-convention drift, retry / wait consistency, documented-vs-actual convention drift, CI integration health. Sister-tier above the per-file critics. |
| Agent | [test-suite-health-auditor](agents/test-suite-health-auditor.md) | Whole-suite cross-tool audit: file inventory, tier classification (unit / integration / E2E), pyramid ratio vs canonical 70/20/10, per-layer flake rate, ROI per tier, selector quality, assertion quality. Emits categorical verdict (Healthy / Needs pruning / Needs refactor / Cannot assess) with top-3 prune/expand/refactor recommendations. Distinct from framework-architecture-auditor (single-framework, narrow) and qa-roles/test-architect (A2, prescribes strategy). |
| Skill | [test-design-scorecard](skills/test-design-scorecard/SKILL.md) | Scores test files 1 to 5 on six design axes with explicit per-level anchors, then turns the scores into growth-framed feedback and a per-author trend. Produces a score, not a merge verdict. |
| Skill | [test-suite-health-audit](skills/test-suite-health-audit/SKILL.md) | Measures a suite on tier mix, pyramid distance, per-layer flake rate and ROI per tier, then reduces to one verdict. Reports against a target without prescribing one. |
| Skill | [test-framework-architecture-audit](skills/test-framework-architecture-audit/SKILL.md) | Audits the framework itself across eight axes (page objects, base-class depth, fixtures, helpers, naming, waits, convention drift, CI) and labels which numeric cuts are conventions rather than standards. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-review@testland-qa
```
