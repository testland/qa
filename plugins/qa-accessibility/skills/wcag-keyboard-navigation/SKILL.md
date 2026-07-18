---
name: wcag-keyboard-navigation
description: "Reference catalog for WCAG 2.2 keyboard-navigation conformance - covers SC 2.1.1 (Keyboard), 2.1.2 (No Keyboard Trap), 2.1.4 (Character Key Shortcuts), 2.4.3 (Focus Order), 2.4.7 (Focus Visible), 2.4.11/2.4.12 (Focus Not Obscured) - with conformance levels (A/AA), test scripts, and per-criterion failure patterns. Use when authoring or reviewing keyboard-only interaction support."
---

# wcag-keyboard-navigation

> Reference catalog for **how** to verify keyboard-navigation
> conformance. Pairs with the runner skills
> ([`axe-a11y`](../axe-a11y/SKILL.md), [`pa11y-a11y`](../pa11y-a11y/SKILL.md),
> [`lighthouse-a11y`](../lighthouse-a11y/SKILL.md)).

## Overview

WCAG 2.2 organizes accessibility into four principles - 
**Perceivable / Operable / Understandable / Robust** - at three
conformance levels - **A / AA / AAA** ([wcag22][wcag22]).

[wcag22]: https://www.w3.org/TR/WCAG22/

Keyboard navigation lives under **Operable** (Principle 2) and
spans six key Success Criteria covering keyboard operability,
focus management, and focus visibility.

## When to use

- Reviewing a component's keyboard interaction surface during PR
  review.
- Authoring a keyboard-navigation test plan for a new component.
- Triaging an accessibility audit finding tagged with one of the
  SCs below.
- Configuring per-rule severities for
  [`axe-a11y`](../axe-a11y/SKILL.md) /
  [`pa11y-a11y`](../pa11y-a11y/SKILL.md).

## Success Criteria

### SC 2.1.1 - Keyboard (Level A)

Per [wcag22][wcag22]: "All functionality of the content is operable
through a keyboard interface" without requiring specific timings.
Path-dependent input (handwriting) is exempt.

| Pattern                                               | What to test                                          |
|-------------------------------------------------------|-------------------------------------------------------|
| `<button>`, `<a href>`, `<input>`                     | Native - already keyboard-accessible.                 |
| `<div onclick="...">`                                 | **Anti-pattern.** Non-focusable; not keyboard-operable. Convert to `<button>`. |
| Custom widget (`role="button"`, `tabindex="0"`)        | Verify Enter / Space activates the same handler.       |
| Drag-and-drop                                         | Provide a keyboard alternative (arrow keys + Enter, or button-based reorder). |

**Test script (Playwright):**

```typescript
test('SC 2.1.1 - interactive elements are keyboard-operable', async ({ page }) => {
  // Tab to the button, activate with Enter
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="action-result"]')).toBeVisible();

  // Repeat with Space for elements that should accept Space
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(...).toBeVisible();
});
```

### SC 2.1.2 - No Keyboard Trap (Level A)

Per [wcag22][wcag22]: "Focus must be movable away using standard
methods; users should be informed of exit procedures if non-
standard keys are required."

| Common failure                                          | Fix                                                   |
|---------------------------------------------------------|-------------------------------------------------------|
| Modal traps Tab without an explicit Escape handler       | Add `Escape` handler that closes the modal and restores focus. |
| Embedded `<iframe>` (e.g. third-party widget) traps Tab   | Set `tabindex="-1"` on the iframe OR document the exit (Esc + Tab) in surrounding label. |
| Custom date picker locks focus inside on first focus      | Provide Tab to exit the calendar and continue to the next field. |

See [`wcag-focus-trap`](../wcag-focus-trap/SKILL.md) for the
**intentional**-trap convention (modal focus management) which is
distinct from a violation.

### SC 2.1.4 - Character Key Shortcuts (Level A, added in 2.1)

Single-character shortcuts (`/` to focus search, `j`/`k` to
navigate items) must offer **at least one** of:

- **Off mechanism** - user can disable the shortcut globally.
- **Remap mechanism** - user can rebind to non-character or
  modifier-prefixed combinations.
- **Active only on focus** - shortcut active only when the
  associated component has focus.

This SC exists because users with speech-input software produce
spurious key presses; unguarded single-character shortcuts trigger
unintended actions.

### SC 2.4.3 - Focus Order (Level A)

Per [wcag22][wcag22]: components must "receive focus in an order
that preserves meaning and operability."

| Pattern                                        | What to test                                           |
|------------------------------------------------|--------------------------------------------------------|
| Reading-order vs DOM-order vs visual-order     | All three should agree. CSS `order` / `flex-direction: row-reverse` can desync visual from DOM. |
| `tabindex="3"` (positive)                      | **Anti-pattern.** Positive tabindex creates explicit focus order separate from DOM; rarely intended. Use `0` or `-1`. |
| Modal that doesn't trap focus                  | Tab moves focus to the page behind; user loses context. |
| Skip links                                     | Always at the start of the document; `tabindex="0"` not needed (anchor links are focusable). |

### SC 2.4.7 - Focus Visible (Level AA)

Per [wcag22][wcag22]: "Any keyboard operable user interface has a
mode of operation where the keyboard focus indicator is visible."

| Failure                                              | Fix                                                  |
|------------------------------------------------------|------------------------------------------------------|
| `*:focus { outline: none; }` without alternative      | Replace with `:focus-visible` style: `:focus-visible { outline: 2px solid var(--focus-ring); }`. |
| Subtle 1px gray ring on a gray background            | 3:1 contrast ratio against background per WCAG SC 1.4.11; high-contrast theme should bump to 4.5:1. |
| Disabled focus indicator on hover                    | Hover and focus styles are independent; never tie them. |

### SC 2.4.11 / 2.4.12 - Focus Not Obscured (Level AA / AAA, NEW in 2.2)

Per [wcag22][wcag22]: components receiving focus cannot be
"entirely hidden due to author-created content."

| Failure pattern                                              | Fix                                                  |
|--------------------------------------------------------------|------------------------------------------------------|
| Sticky header covers the focused input on long-form pages     | Adjust `scroll-margin-top` so focused element scrolls into view below the sticky header. |
| Persistent cookie banner covers focused element              | Modal / overlay should NOT obscure focused content; use compact banner or temporarily hide. |
| Auto-popup chat widget overlays focused fields                | Render below other content OR move to a corner that doesn't intersect with form fields. |

**2.4.11 (Minimum, Level AA):** focus must NOT be **entirely**
obscured.

**2.4.12 (Enhanced, Level AAA):** focus must NOT be **partially**
obscured. Stricter; relevant for high-stakes forms.

## Per-component test patterns

### Form

1. Tab through every field; verify focus order matches reading
   order.
2. Verify each interactive element has a visible focus ring.
3. Verify label-input association via `<label for="...">` or
   `aria-labelledby`.
4. Activate submit via Enter from any field.
5. After submit error: verify focus moves to the first invalid
   field (per SC 3.3.1 - Error Identification).

### Modal / dialog

1. On open: focus moves to the first interactive element
   (or to the dialog's close button if no other focusable element).
2. Tab cycles through dialog content only - does NOT escape to
   page behind.
3. Shift+Tab from first → last interactive element (cycle).
4. Escape closes the dialog and returns focus to the trigger.

(See [`wcag-focus-trap`](../wcag-focus-trap/SKILL.md) for the full
modal pattern.)

### Menu / dropdown

1. Tab focuses the trigger.
2. Enter / Space / Down-arrow opens the menu; first item focused.
3. Down/Up arrows navigate items; Home/End jump to first/last.
4. Enter / Space activates the focused item.
5. Escape closes the menu and returns focus to the trigger.

This matches the [ARIA Menu pattern][aria-menu] (referenced from
[`aria-authoring-patterns`](../aria-authoring-patterns/SKILL.md)).

[aria-menu]: https://www.w3.org/WAI/ARIA/apg/patterns/menubar/

### Tabs

1. Tab focuses the active tab (one tabstop per tab group).
2. Left/Right arrows navigate between tabs (no Tab key).
3. Activation: automatic on focus OR explicit on Enter/Space
   (manual activation; ARIA Authoring Practices defaults).
4. After tab change: Tab moves to the panel content.

## CI integration

The patterns above translate to per-test assertions in
[`axe-a11y`](../axe-a11y/SKILL.md) /
[`pa11y-a11y`](../pa11y-a11y/SKILL.md) configurations. The
[`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) skill
gates the build on new violations of these SCs.

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| `<div onclick>` for buttons                                    | Not focusable, not Enter-activatable.                              | Always `<button type="button">`. |
| `outline: none` for clean design                                | Removes focus indicator entirely (SC 2.4.7).                       | `:focus-visible { outline: 2px solid <color>; }`. |
| `tabindex="3"` to control focus order                           | Creates a non-DOM order; breaks on dynamic content.                | DOM-order tabbing; `tabindex="0"` for custom focusables, `-1` to skip. |
| Single-character shortcuts always-active                        | Triggered by speech-input users (SC 2.1.4).                         | Off / remap / focus-only. |
| Sticky header obscures focused input                            | Violates SC 2.4.11.                                                 | `scroll-margin-top` per element. |

## References

- [wcag22][wcag22] - WCAG 2.2 specification.
- [`wcag-focus-trap`](../wcag-focus-trap/SKILL.md) - focus
  management for modals (the intentional-trap pattern).
- [`wcag-color-contrast`](../wcag-color-contrast/SKILL.md) - 
  for SC 1.4.11 focus-indicator contrast.
- [`aria-authoring-patterns`](../aria-authoring-patterns/SKILL.md) - for canonical interactive-widget patterns.
- [`axe-a11y`](../axe-a11y/SKILL.md),
  [`pa11y-a11y`](../pa11y-a11y/SKILL.md),
  [`lighthouse-a11y`](../lighthouse-a11y/SKILL.md) - runners that
  detect SC violations programmatically.
