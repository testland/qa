---
name: wcag-focus-trap
description: "Reference for **intentional** focus management in modal / dialog / drawer / popover components — the canonical pattern that satisfies WCAG SC 2.4.3 (Focus Order) without violating SC 2.1.2 (No Keyboard Trap). Covers focus-on-open, focus-cycle-within-container, Escape-closes-and-restores, return-to-trigger, and inert-the-rest-of-the-page. Use when authoring or reviewing any component that displays content over the page (modals, drawers, popovers, command palettes)."
rating: 25
d6: 5
archetype: S2
---

# wcag-focus-trap

## Overview

A modal that doesn't manage focus is broken: keyboard users tab past
it into the dimmed page underneath; screen-reader users hear the
page content as if the modal isn't open. The fix is **intentional
focus management** — sometimes called a "focus trap" — but the term
is misleading: it's not a trap, it's a **scope**. WCAG SC 2.1.2
forbids unintentional traps; this skill describes the intentional
pattern that satisfies SC 2.4.3 (Focus Order) without violating
2.1.2 ([wcag22][wcag22]).

[wcag22]: https://www.w3.org/TR/WCAG22/

## When to use

- Authoring a modal / dialog / drawer / popover / command palette /
  any component that displays over the page.
- Reviewing a third-party UI library's modal for accessibility.
- Diagnosing a focus-management bug ("Tab escapes the modal" /
  "Escape doesn't close" / "focus goes to body after close").

## The 6-step canonical pattern

### Step 1 — On open, move focus into the container

The first focusable element in the modal receives focus
automatically. If the modal has no focusable content (a notification
modal with one OK button — focus the OK button), focus the close
button.

```javascript
function openModal(modalEl) {
  modalEl.hidden = false;
  const firstFocusable = modalEl.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  firstFocusable?.focus();
}
```

### Step 2 — Set `aria-modal="true"` and `role="dialog"`

```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
  <h2 id="modal-title">Confirm deletion</h2>
  ...
</div>
```

`role="dialog"` is the canonical role per the [ARIA Dialog
pattern][aria-dialog]. `aria-modal="true"` tells assistive
technologies to treat content outside the dialog as inert.

[aria-dialog]: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

### Step 3 — Inert the rest of the page

Content outside the modal must be untabbable AND untraversable by
screen readers. Two mechanisms:

```html
<!-- Modern -->
<main inert>...</main>             <!-- inert attribute (Baseline 2024) -->
<aside role="dialog" ...>...</aside>
```

```javascript
// Pre-inert fallback: cycle focusable elements outside the dialog,
// store their tabindex, set them to -1, restore on close.
```

`inert` removes the subtree from sequential focus AND from screen-
reader navigation. Browsers that don't support `inert` need a
polyfill.

### Step 4 — Cycle focus within the container on Tab / Shift+Tab

Tab from the last focusable element wraps to the first; Shift+Tab
from the first wraps to the last:

```javascript
function trapFocus(event, modalEl) {
  if (event.key !== 'Tab') return;

  const focusables = Array.from(modalEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.disabled && el.offsetParent !== null);

  if (focusables.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    last.focus();
    event.preventDefault();
  } else if (!event.shiftKey && document.activeElement === last) {
    first.focus();
    event.preventDefault();
  }
}
```

### Step 5 — Escape closes the modal

Per the [ARIA Dialog pattern][aria-dialog], Escape SHOULD close
non-destructive dialogs. Destructive ("Are you sure?") dialogs may
omit Escape close to avoid accidental dismissal.

```javascript
function onKeyDown(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
}
```

### Step 6 — On close, restore focus to the trigger

The element that opened the modal receives focus back. Without
this, focus lands on `<body>` and the user is disoriented:

```javascript
let triggerElement = null;

function openModal(modalEl, trigger) {
  triggerElement = trigger;
  // ...steps 1-3 above
}

function closeModal(modalEl) {
  modalEl.hidden = true;
  // remove inert from rest of page, etc.
  triggerElement?.focus();
  triggerElement = null;
}
```

## Native `<dialog>` element

Modern browsers ship `<dialog>` with most of this pattern built in:

```html
<dialog id="confirmDelete" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm deletion</h2>
  <button id="cancel">Cancel</button>
  <button id="confirm">Delete</button>
</dialog>
```

```javascript
const dialog = document.getElementById('confirmDelete');
dialog.showModal();   // automatic: inert outside, focus inside, Escape closes
```

`showModal()` (vs. `show()`) automatically:
- Sets `aria-modal="true"` and `role="dialog"`.
- Inerts the page outside the dialog.
- Captures Escape (default close).

What it does NOT do automatically:
- Restore focus to the trigger on close.
- Move focus to a specific element on open (focuses the dialog by
  default, which announces the dialog title via screen reader).
- Cycle focus on Tab (browsers do this implicitly by inerting the
  outside).

## Library-provided dialogs

Most UI libraries (Radix, Headless UI, ARIA Modal, focus-trap) ship
the pattern. Verify they do all 6 steps:

| Library                | Steps 1-6 supported?                             |
|------------------------|--------------------------------------------------|
| Radix UI Dialog        | Yes (uses `<dialog>` internally; aria-modal; restore focus). |
| Headless UI Dialog     | Yes.                                             |
| `<dialog>` (native)    | Steps 1-5; Step 6 (restore focus) requires manual code. |
| Bootstrap Modal        | Older versions: incomplete (no inert; pre-aria-modal). |
| Custom hand-rolled     | Often missing Step 3 (inert) and Step 6 (restore focus). |

## Test scripts

### Test 1 — Focus moves on open

```typescript
test('SC 2.4.3 — focus enters dialog on open', async ({ page }) => {
  await page.locator('[data-testid="open-dialog"]').click();
  await expect(page.locator('[role="dialog"] button').first()).toBeFocused();
});
```

### Test 2 — Tab cycles within dialog

```typescript
test('SC 2.1.2 — Tab cycles within dialog', async ({ page }) => {
  await page.locator('[data-testid="open-dialog"]').click();
  // Tab to last
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
  // Next Tab cycles to first
  await page.keyboard.press('Tab');
  await expect(page.locator('[role="dialog"] button').first()).toBeFocused();
});
```

### Test 3 — Escape closes; focus returns to trigger

```typescript
test('SC 2.1.2 + 2.4.3 — Escape closes; focus restored', async ({ page }) => {
  const trigger = page.locator('[data-testid="open-dialog"]');
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[role="dialog"]')).toBeHidden();
  await expect(trigger).toBeFocused();
});
```

### Test 4 — Outside content is inert

```typescript
test('outside content is unreachable by Tab', async ({ page }) => {
  await page.locator('[data-testid="open-dialog"]').click();
  // Tab N times; should never land outside the dialog
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const inDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement);
    });
    expect(inDialog).toBe(true);
  }
});
```

## Common bugs

| Bug                                                  | Symptom                                                            | Fix |
|------------------------------------------------------|---------------------------------------------------------------------|-----|
| No focus on open                                      | Screen reader doesn't announce the dialog; user must Tab to find it. | Step 1 — focus first element. |
| Tab escapes to page                                   | Keyboard users lose context.                                       | Step 3 (inert) or Step 4 (cycle). |
| Escape doesn't close                                  | Users assume modal is broken; close-button-only.                   | Step 5 — bind Escape. |
| Focus jumps to body on close                          | User is disoriented; must Tab back to where they were.             | Step 6 — restore to trigger. |
| Background page scrolls while modal is open           | Not a focus issue but related; user thinks they're on the page.    | `body { overflow: hidden; }` while modal open. |

## Anti-patterns

| Anti-pattern                                                     | Why it fails                                                       | Fix |
|------------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Hand-rolled `Tab`-key listener that never matches Tab+Shift cases | Shift+Tab on first element escapes the dialog.                     | Implement both directions per Step 4. |
| Setting `aria-hidden="true"` on the modal trigger                  | The trigger element gets a focus indicator that ARIA hides; confusing. | Don't aria-hide the trigger; only inert the page when modal is open. |
| `<div role="dialog">` without `aria-modal="true"`                   | Screen readers don't treat content outside as inert.                | Always include `aria-modal="true"`. |
| Tab-cycle that skips disabled buttons inconsistently               | Some focusables disabled; Tab still lands on them.                  | Filter by `:not([disabled])` AND `offsetParent !== null` (not display:none). |
| Closing modal on outside-click without Escape                      | Keyboard users can't close.                                        | Always bind Escape (Step 5). |

## References

- [wcag22][wcag22] — WCAG 2.2; SC 2.1.2, 2.4.3, 2.4.11.
- [aria-dialog][aria-dialog] — ARIA Authoring Practices Guide:
  Dialog (Modal) Pattern.
- HTML Living Standard `<dialog>` element — https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
- `inert` attribute — https://html.spec.whatwg.org/multipage/interaction.html#the-inert-attribute
- [`wcag-keyboard-navigation`](../wcag-keyboard-navigation/SKILL.md)
  — broader keyboard-conformance skill.
- [`aria-authoring-patterns`](../aria-authoring-patterns/SKILL.md)
  — pattern reference for other widgets.
