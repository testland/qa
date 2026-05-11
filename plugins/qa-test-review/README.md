# qa-test-review

Test code quality reviewers — agents specialized for **test files only**, not production code. Production-code reviewers are well-served by the broader ecosystem; test-code hygiene (AAA structure, assertion specificity, mocking anti-patterns, E2E selector quality) is its own discipline and gets its own reviewers here.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [test-code-conventions](skills/test-code-conventions/SKILL.md) | S2 | Pure-reference catalog (§1-§10): AAA structure, single-responsibility, naming, assertion specificity, mocking, fixture coupling, magic numbers, E2E selectors, web-first assertions, slow setup. The agents in this plugin cite back to it. |
| Agent | [test-code-critic](agents/test-code-critic.md) | A3 | Walks structure / naming / single-responsibility / magic-number / slow-setup violations (§1-§3, §6, §7, §10). Refuses to review production code. |
| Agent | [assertion-quality-reviewer](agents/assertion-quality-reviewer.md) | A3 | Rates each assertion as specific / narrow-vague / wide-vague / match-vague (§4). Recommends specific replacements. |
| Agent | [mocking-anti-pattern-detector](agents/mocking-anti-pattern-detector.md) | A3 | Flags over-mocking, behavior-verification leakage, mock chains, mocking-what-you-don't-own, and fake-candidate situations (§5). |
| Agent | [e2e-selector-quality-critic](agents/e2e-selector-quality-critic.md) | A3 | Flags brittle CSS class / nth-child / XPath selectors and non-web-first assertions; recommends `getByRole` / accessibility-first equivalents (§8, §9). |
| Agent | [framework-architecture-auditor](agents/framework-architecture-auditor.md) | A3 | Cross-file framework audit: POM consistency, base-class hierarchy depth, fixture coupling, helper sprawl, naming-convention drift, retry / wait consistency, documented-vs-actual convention drift, CI integration health. Sister-tier above the per-file critics. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-review@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
