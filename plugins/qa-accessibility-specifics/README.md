# qa-accessibility-specifics

Atomic accessibility coverage: 4 WCAG 2.2 conventions (keyboard, focus-trap, contrast, ARIA), screen-reader narrative authoring, a11y violation gate, adversarial code critic, checklist builder, and 5 tool wrappers (axe / pa11y / Lighthouse a11y / WAVE / IBM Equal Access).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [wcag-keyboard-navigation](skills/wcag-keyboard-navigation/SKILL.md) | S2 | WCAG 2.2 keyboard SCs (2.1.1, 2.1.2, 2.1.4, 2.4.3, 2.4.7, 2.4.11) with per-criterion test scripts. |
| skill | [wcag-focus-trap](skills/wcag-focus-trap/SKILL.md) | S2 | Modal/drawer focus management — 6-step canonical pattern; native `<dialog>` integration. |
| skill | [wcag-color-contrast](skills/wcag-color-contrast/SKILL.md) | S2 | WCAG 2.2 SCs 1.4.3/1.4.6/1.4.11/1.4.13; canonical ratios; design-token bulk checking. |
| skill | [aria-authoring-patterns](skills/aria-authoring-patterns/SKILL.md) | S2 | W3C ARIA Authoring Practices Guide reference for the 31 widget patterns. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-accessibility-specifics@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
