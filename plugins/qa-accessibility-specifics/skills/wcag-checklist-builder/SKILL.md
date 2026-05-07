---
name: wcag-checklist-builder
description: "Builds a per-component WCAG 2.2 accessibility checklist from a component spec — covers focus management, color contrast, ARIA roles & states, keyboard interaction, error handling, and live-region announcements — emitting a markdown checklist or YAML test plan that pairs with screen-reader-test-author for manual verification and the violation gate for automated scans. Use during component-spec review or pre-implementation acceptance."
rating: 24
d6: 4
archetype: S3
---

# wcag-checklist-builder

## Overview

A component-level a11y checklist makes acceptance criteria explicit
*before* implementation. Without one, "is this accessible?" becomes
a vague handoff between design, eng, and QA. This skill takes the
component's spec (props, states, interaction model) and emits the
matching WCAG 2.2 checklist.

The checklist pairs with:

- [`screen-reader-test-author`](../screen-reader-test-author/SKILL.md)
  for manual verification.
- [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) for
  automated scans.
- [`accessibility-code-critic`](../../agents/accessibility-code-critic.md)
  for adversarial code review.

## When to use

- Reviewing a component spec before implementation.
- Building an a11y-acceptance gate at design-review time.
- Onboarding a new component into the design system; need to
  retrofit a11y verification.
- Pre-PR self-review for component contributors.

## Step 1 — Identify the component archetype

The skill maps to one of these archetypes; each has its own
checklist pattern:

| Archetype                    | Examples                                |
|------------------------------|-----------------------------------------|
| Static text / display        | Heading, badge, banner, blockquote.     |
| Interactive — single trigger  | Button, link, icon button.              |
| Interactive — form input     | Text input, checkbox, radio, select, switch. |
| Interactive — multi-state    | Disclosure, accordion, tabs, popover.   |
| Interactive — overlay        | Modal, drawer, dropdown menu, command palette. |
| Composite                    | Combobox, date picker, multi-select, tree. |
| Live region                  | Toast, alert, in-page status, error banner. |
| Layout / navigation         | Header, footer, breadcrumb, pagination.  |

For each archetype, the matching checklist sections are below.

## Step 2 — Apply the per-archetype checklist

### Static text / display

- [ ] Heading levels are sequential (h1 → h2 → h3; no skips).
- [ ] Color contrast ≥4.5:1 (or 3:1 for large text per
      [`wcag-color-contrast`](../wcag-color-contrast/SKILL.md)).
- [ ] Decorative-only images have empty `alt=""`; meaningful
      images have descriptive `alt`.
- [ ] Information conveyed by color alone is also conveyed in
      another way (text, icon, pattern; SC 1.4.1).

### Interactive — single trigger

- [ ] Native `<button>` / `<a href>` used (no `<div onclick>`).
- [ ] Visible focus indicator at ≥3:1 contrast vs. background.
- [ ] Activatable via Enter (and Space for `<button>`).
- [ ] Accessible name matches visible label (or is announced via
      `aria-label` / `aria-labelledby` if no visible label).
- [ ] On press: announces state change if applicable (e.g.
      toggle button announces `aria-pressed`).
- [ ] Loading / disabled states programmatically conveyed
      (`aria-disabled` / `aria-busy`).

### Interactive — form input

- [ ] Has a `<label for="...">` OR `aria-labelledby` referencing a
      visible label.
- [ ] Required fields marked via `required` (native) AND a non-
      color cue (text or icon).
- [ ] Validation errors conveyed via `aria-invalid="true"` plus
      an error message linked via `aria-describedby`.
- [ ] On invalid submit: focus moves to the first invalid field.
- [ ] Autocomplete attributes set per WCAG 2.2 SC 1.3.5
      (`autocomplete="email"`, `"name"`, etc.).
- [ ] Placeholder is NOT used as the only label.

### Interactive — multi-state (disclosure / accordion / tabs)

- [ ] `aria-expanded` reflects open/closed state on the trigger.
- [ ] `aria-controls` references the controlled region's `id`.
- [ ] Keyboard interaction matches the [APG pattern][apg]:
  - Disclosure: Enter/Space toggles.
  - Accordion: Tab between headers; Enter/Space toggles.
  - Tabs: Tab to active tab; Left/Right to navigate; Home/End.
- [ ] Hidden content uses the `hidden` attribute or
      `display: none` (NOT `visibility: hidden` or `opacity: 0`
      which leave the content focusable).

[apg]: https://www.w3.org/WAI/ARIA/apg/patterns/

### Interactive — overlay (modal / drawer / popover)

(See [`wcag-focus-trap`](../wcag-focus-trap/SKILL.md) for the
6-step pattern.)

- [ ] `role="dialog"` (modal) OR `role="alertdialog"` (interrupt).
- [ ] `aria-modal="true"` for modals.
- [ ] `aria-labelledby` references the dialog's title.
- [ ] On open: focus moves into the dialog.
- [ ] Tab cycles within the dialog; doesn't escape to the page.
- [ ] Escape closes (for non-destructive dialogs).
- [ ] On close: focus returns to the triggering element.
- [ ] Outside content is `inert` (or pre-inert focusable cycle).

### Composite (combobox, date picker, multi-select)

(See [`aria-authoring-patterns`](../aria-authoring-patterns/SKILL.md).)

- [ ] Match the matching APG pattern's full keyboard model.
- [ ] `aria-expanded` on the trigger.
- [ ] `aria-controls` linking trigger to the popup.
- [ ] `aria-activedescendant` (when not moving DOM focus) OR
      moves DOM focus into the popup.
- [ ] Selected state announced via `aria-selected` (listbox) or
      `aria-checked` (tree).
- [ ] Type-ahead works (typing a letter focuses matching item).

### Live region

- [ ] Container has `role="status"` (polite) or `role="alert"`
      (assertive) OR `aria-live="polite"` / `"assertive"`.
- [ ] Container exists in the DOM **before** content is inserted
      (live regions only announce changes; pre-mounted with
      content suppresses the first announcement).
- [ ] Content updates are detected — for SPA frameworks, ensure
      the framework's render produces a real DOM mutation rather
      than a virtual-DOM-only update.

### Layout / navigation

- [ ] Landmarks declared: `<header>` / `<main>` / `<nav>` /
      `<footer>` / `<aside>`. (One `<main>` per page.)
- [ ] Skip-to-main-content link as the first focusable element.
- [ ] Pagination controls have `aria-label` (e.g. "Pagination").
- [ ] Breadcrumb has `aria-label="Breadcrumb"` and
      `aria-current="page"` on the current page.

## Step 3 — Add per-component customization

Beyond the archetype defaults, the spec may declare:

- **Custom keyboard shortcuts** — verify SC 2.1.4 (Character Key
  Shortcuts).
- **Animation / motion** — verify SC 2.3.3 (Animation from
  Interactions) and respect `prefers-reduced-motion`.
- **Auto-rotating content** (carousel, ticker) — pause / play
  control; SC 2.2.2 (Pause, Stop, Hide).
- **Time-limited interactions** (countdown timer) — pause /
  extend control; SC 2.2.1 (Timing Adjustable).

## Step 4 — Emit the artifact

The skill produces two outputs:

### Markdown checklist (for spec / PR review)

```markdown
## A11y Checklist — `<ComponentName>`

**Archetype:** Interactive — overlay (modal)

### Required (must pass before merge)

- [ ] Modal has `role="dialog"` and `aria-modal="true"`.
- [ ] Modal title is `aria-labelledby`-referenced.
- [ ] On open: focus moves to first focusable inside modal.
- [ ] Tab cycles within modal; outside content is `inert`.
- [ ] Escape closes; focus returns to trigger.
- [ ] Close button has accessible name "Close" or "Dismiss".
- [ ] Focus indicator on close button at ≥3:1 contrast.

### Per-component (this design adds)

- [ ] Confirmation modal's "Delete" button has `aria-describedby`
      linking to the warning text.
- [ ] On confirm: live region announces "Deleted" via
      `aria-live="polite"`.

### Verification

- Automated: axe-core scan with `dialog` rule enabled.
- Manual: NVDA + Firefox per [`screen-reader-test-author`](../screen-reader-test-author/SKILL.md).
- Code review: [`accessibility-code-critic`](../../agents/accessibility-code-critic.md) agent.
```

### YAML test plan (for test-management tools)

```yaml
component: ConfirmModal
archetype: overlay-modal
checks:
  - id: AC-MODAL-1
    description: Modal has role and aria-modal
    severity: blocker
    method: automated
    rule: axe::role-modal
  - id: AC-MODAL-2
    description: Focus moves to first focusable on open
    severity: blocker
    method: e2e-test
    framework: playwright
  - id: AC-MODAL-3
    description: Escape closes; focus restored
    severity: blocker
    method: e2e-test
  - id: AC-MODAL-4
    description: Live region announces "Deleted" on confirm
    severity: blocker
    method: manual
    tester_role: a11y-specialist
    instructions: NVDA + Firefox per screen-reader-test-author
```

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Generic checklist for all components                          | Static text doesn't need keyboard checks; modal does.              | Per-archetype checklist; pick once. |
| Checklist created post-implementation                          | A11y becomes a retrofit; bugs found late.                          | Run this skill on the spec, before implementation. |
| Marking items "won't fix" without rationale                   | Loss of institutional knowledge; same item resurfaces next quarter.| Document each waiver with a date + reviewer initials. |
| One mega-checklist per component (50+ items)                   | Reviewer fatigue; rubber-stamping.                                  | Per-archetype defaults; only add custom items the design demands. |

## References

- W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- W3C ARIA Authoring Practices — [apg][apg].
- All sibling skills in this plugin:
  [`wcag-keyboard-navigation`](../wcag-keyboard-navigation/SKILL.md),
  [`wcag-focus-trap`](../wcag-focus-trap/SKILL.md),
  [`wcag-color-contrast`](../wcag-color-contrast/SKILL.md),
  [`aria-authoring-patterns`](../aria-authoring-patterns/SKILL.md),
  [`screen-reader-test-author`](../screen-reader-test-author/SKILL.md),
  [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md).
- [`accessibility-code-critic`](../../agents/accessibility-code-critic.md)
  — adversarial agent that consumes this skill's output.
