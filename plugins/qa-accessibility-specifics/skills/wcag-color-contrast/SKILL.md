---
name: wcag-color-contrast
description: Reference for WCAG 2.2 color-contrast conformance — covers SC 1.4.3 Contrast (Minimum, AA), 1.4.6 Contrast (Enhanced, AAA), 1.4.11 Non-text Contrast (AA), and 1.4.13 Content on Hover or Focus (AA) — with the canonical contrast ratios (4.5:1 normal text, 3:1 large text and UI components), measurement formula references, and bulk design-token checking patterns. Use when designing a color palette, reviewing a component for accessibility, or auditing existing CSS for contrast violations.
rating: 26
d6: 5
archetype: S2
---

# wcag-color-contrast

## Overview

WCAG 2.2 specifies four color-contrast Success Criteria
([wcag22][wcag22]):

[wcag22]: https://www.w3.org/TR/WCAG22/

| SC      | Level | What it covers                                                       |
|---------|-------|----------------------------------------------------------------------|
| 1.4.3   | AA    | Text contrast minimums — **4.5:1** normal, **3:1** large.           |
| 1.4.6   | AAA   | Enhanced text contrast — **7:1** normal, **4.5:1** large.            |
| 1.4.11  | AA    | Non-text contrast — UI components and graphics — **3:1**.           |
| 1.4.13  | AA    | Content on Hover/Focus — keyboard-dismissable, hoverable, persistent.|

**Large text** per WCAG 2.2 ([wcag22][wcag22]): 18pt+ regular OR
14pt+ bold (24px / 18.66px in browsers default; 19px+ if bold).

## When to use

- Designing a new color palette / design tokens.
- Reviewing a component's CSS for contrast violations.
- Setting up bulk-checking of design tokens via tooling.
- Authoring per-component a11y checklists (paired with
  [`wcag-checklist-builder`](../wcag-checklist-builder/SKILL.md)).
- Configuring per-rule severity in
  [`axe-a11y`](../axe-a11y/SKILL.md) /
  [`pa11y-a11y`](../pa11y-a11y/SKILL.md).

## Contrast ratios

### Text (SC 1.4.3 — Level AA)

| Text size                                  | Required ratio |
|--------------------------------------------|----------------|
| Normal text (<18pt regular, <14pt bold)    | **4.5:1**       |
| Large text (≥18pt regular OR ≥14pt bold)   | **3:1**         |

**Exceptions** per [wcag22][wcag22]:

- Pure decoration (text in a logo, "lorem ipsum" filler).
- Inactive UI elements (disabled buttons — though the disabled
  state should still have visible-but-low-contrast text).
- Logotypes — brand text within a logo.
- Incidental text (text within an image of running text where the
  image isn't an essential conveyance of information).

### Text (SC 1.4.6 — Level AAA)

The enhanced version doubles down: **7:1** normal, **4.5:1** large.
Use this for accessibility-first products (educational platforms,
public-sector services).

### UI components and graphics (SC 1.4.11 — Level AA, NEW in 2.1)

Visual presentation of UI components and graphical objects must
have **3:1** contrast against adjacent colors. This applies to:

- Form input borders.
- Focus indicators (per
  [`wcag-keyboard-navigation`](../wcag-keyboard-navigation/SKILL.md)
  SC 2.4.7).
- Icon buttons that don't have text labels.
- Visual state indicators (toggle switches, checkboxes).
- Required-field indicators that rely on color alone.

### Content on Hover or Focus (SC 1.4.13 — Level AA)

Tooltips, dropdowns, and other content that appears on hover/focus
must satisfy three conditions:

| Condition       | Meaning                                                       |
|-----------------|---------------------------------------------------------------|
| **Dismissable** | User can dismiss the additional content without moving pointer or focus (typically: Esc key). |
| **Hoverable**   | If the content appears on hover, the user can move the pointer onto the additional content without dismissing it. |
| **Persistent**  | The additional content remains visible until the user dismisses it, hover/focus moves elsewhere, OR the information is no longer valid. |

Most "tooltip" libraries fail one of these — typically Hoverable
(pointer leaves trigger → tooltip dismisses → can't read it).

## Measuring contrast

The WCAG contrast formula uses **relative luminance** (per
[wcag22][wcag22] formula):

```
ratio = (L1 + 0.05) / (L2 + 0.05)
```

where `L1` is the relative luminance of the lighter color and `L2`
of the darker. Ratios run from 1:1 (identical colors) to 21:1
(black on white).

You don't compute it manually — use a tool:

| Tool                              | Notes                                              |
|-----------------------------------|----------------------------------------------------|
| WebAIM Contrast Checker           | https://webaim.org/resources/contrastchecker/      |
| Chrome DevTools                   | Element panel → Styles → color swatch → Contrast.  |
| Figma plugins (Stark, Able)       | Inline check during design.                        |
| `polished` (npm) `getContrast()`  | Programmatic check in tests / lint rules.          |
| `axe-core`                        | Reports all on-screen contrast violations during a scan ([axe-a11y](../axe-a11y/SKILL.md)). |

## Common ratios for canonical color pairings

| Foreground / background       | Ratio           | Notes                  |
|-------------------------------|-----------------|------------------------|
| `#000000` on `#FFFFFF`        | 21:1            | Maximum.               |
| `#FFFFFF` on `#000000`        | 21:1            | Reversed; same.        |
| `#767676` on `#FFFFFF`        | 4.54:1          | Just passes 4.5:1.     |
| `#999999` on `#FFFFFF`        | 2.85:1          | Fails AA normal text.  |
| `#0000EE` (default link) on `#FFFFFF` | 8.59:1  | Passes AAA.            |

The "just-passes" boundary `#767676` is a design pitfall — small
font-rendering shifts on Windows ClearType can drop the perceived
contrast below 4.5:1. Aim for ≥5:1 in practice.

## Design token bulk checking

When the project has a design-token system (e.g.
`--color-text-primary: #1a1a1a`), check token combinations
en masse:

```javascript
// scripts/check-contrast.js
const { getContrast } = require('polished');

const tokens = require('../tokens/colors.json');

const TEXT_PAIRS = [
  ['--color-text-primary', '--color-bg-default'],
  ['--color-text-secondary', '--color-bg-default'],
  ['--color-text-on-primary', '--color-bg-primary'],
  ['--color-link', '--color-bg-default'],
  ['--color-error', '--color-bg-default'],
];

const violations = [];
for (const [fg, bg] of TEXT_PAIRS) {
  const ratio = getContrast(tokens[fg], tokens[bg]);
  if (ratio < 4.5) {
    violations.push({ fg, bg, ratio: ratio.toFixed(2) });
  }
}

if (violations.length > 0) {
  console.error('Contrast violations:', violations);
  process.exit(1);
}
```

Wire into CI per [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md).

## Common failures

| Pattern                                              | Why it fails                                            | Fix                                |
|------------------------------------------------------|---------------------------------------------------------|------------------------------------|
| `color: #999` on white                                | 2.85:1 — fails AA.                                      | Darken to `#767676` or darker.    |
| Placeholder text in `#aaa`                            | Same problem; placeholders are still text.             | Match the disabled-text color used elsewhere; ≥4.5:1 OR remove placeholder reliance and use floating labels. |
| White text on a brand-color button                    | Many brand colors fail 4.5:1 with pure white.          | Darken the brand color OR add a darker tone for hover/active. |
| Focus ring `#aaa` on a `#fff` background              | 2.85:1 — fails SC 1.4.11 (3:1).                          | Use `#666` or darker; or add a 1px outline that contrasts both ways. |
| Required-field marker via red-only `*`                | Red on white: ~4:1 — passes — but **also** color-alone (SC 1.4.1). | Add a non-color cue: text "(required)" or an icon. |
| Disabled button text contrast below 3:1               | Even disabled text should be perceivable.                | ~3:1 minimum on disabled; test with users for whether this matches expected interactivity. |

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Designing in pure RGB (`#3CB371`) without a CIELab-aware tool | Two colors with the same RGB distance can have wildly different luminance ratios. | Use a tool that computes WCAG-formula ratio. |
| Asserting contrast at the **token** level only                 | Tokens are correct but actual rendered contrast differs (transparency, pseudo-elements, dark mode). | Bulk-check token pairs AND scan the rendered DOM via axe-core. |
| Single-mode token check                                       | Light-mode pairs pass but dark-mode pairs fail.                   | Check every theme variant. |
| Using `opacity` / `rgba` for subtle text                       | The browser blends; perceived contrast against the background is whatever the blended result computes to — often below threshold. | Compute the blended color first; check that. |

## References

- [wcag22][wcag22] — WCAG 2.2 SCs 1.4.3, 1.4.6, 1.4.11, 1.4.13.
- WebAIM Contrast Checker — https://webaim.org/resources/contrastchecker/
- WCAG contrast formula (luminance) — https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
- [`wcag-keyboard-navigation`](../wcag-keyboard-navigation/SKILL.md)
  — for SC 2.4.7 focus-indicator contrast.
- [`axe-a11y`](../axe-a11y/SKILL.md) — runtime contrast checker.
- [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) —
  CI gate for contrast (and other) violations.
