# qa-accessibility

Atomic accessibility coverage: WCAG 2.2 keyboard + focus-trap + contrast + ARIA references, the full manual-a11y artifact surface (screen-reader scripts, checklists, widget matrices, guided sessions), the a11y violation gate, an adversarial code critic, the axe-a11y scanner umbrella (axe-core / pa11y / Lighthouse a11y / WAVE / IBM Equal Access), and a WCAG conformance reporter.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [wcag-keyboard-navigation](skills/wcag-keyboard-navigation/SKILL.md) | WCAG 2.2 keyboard SCs (2.1.1, 2.1.2, 2.1.4, 2.4.3, 2.4.7, 2.4.11) with per-criterion test scripts; modal focus-trap pattern in references/. |
| Skill | [wcag-color-contrast](skills/wcag-color-contrast/SKILL.md) | WCAG 2.2 SCs 1.4.3/1.4.6/1.4.11/1.4.13; canonical ratios; design-token bulk checking. |
| Skill | [aria-authoring-patterns](skills/aria-authoring-patterns/SKILL.md) | W3C ARIA Authoring Practices Guide reference for the 31 widget patterns. |
| Skill | [screen-reader-test-author](skills/screen-reader-test-author/SKILL.md) | The manual-a11y artifact surface: NVDA / JAWS / VoiceOver / TalkBack test scripts, per-archetype WCAG checklists, per-widget keystroke matrices, and guided signed sessions. |
| Skill | [a11y-violation-gate](skills/a11y-violation-gate/SKILL.md) | CI gate with ratchet pattern: fail on new violations vs. baseline; aggregate axe / pa11y / Lighthouse / WAVE / IBM Equal Access. |
| Skill | [axe-a11y](skills/axe-a11y/SKILL.md) | Automated accessibility scanning umbrella: axe-core primary (JS API, @axe-core/playwright, tags, rule disable); pa11y, Lighthouse a11y, WAVE, and IBM Equal Access in references/. |
| Skill | [wcag-compliance-reporter](skills/wcag-compliance-reporter/SKILL.md) | Build-an-X per-page WCAG 2.2 conformance report aggregating multi-scanner output; per-SC + per-level rollup; "unknown" verdict for SCs no tool covers. |
| Agent | [accessibility-code-critic](agents/accessibility-code-critic.md) | Adversarial source-code review for `<div onclick>`, missing focus mgmt, color-only cues, ARIA misuse; cites WCAG SC + remediation. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-accessibility@testland-qa
```
