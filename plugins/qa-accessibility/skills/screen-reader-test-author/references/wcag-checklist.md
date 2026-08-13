# Per-archetype WCAG 2.2 checklist builder

Companion reference for `screen-reader-test-author`. Consult when a component
spec needs explicit a11y acceptance criteria *before* implementation, when
building an a11y-acceptance gate at design-review time, or for pre-PR
self-review. The checklist pairs with the SKILL.md test narratives for manual
verification and with `a11y-violation-gate` for automated scans.

## Step 1 - Identify the component archetype

Each archetype has its own checklist pattern:

| Archetype                    | Examples                                |
|------------------------------|-----------------------------------------|
| Static text / display        | Heading, badge, banner, blockquote.     |
| Interactive - single trigger | Button, link, icon button.              |
| Interactive - form input     | Text input, checkbox, radio, select, switch. |
| Interactive - multi-state    | Disclosure, accordion, tabs, popover.   |
| Interactive - overlay        | Modal, drawer, dropdown menu, command palette. |
| Composite                    | Combobox, date picker, multi-select, tree. |
| Live region                  | Toast, alert, in-page status, error banner. |
| Layout / navigation          | Header, footer, breadcrumb, pagination. |

## Step 2 - Apply the per-archetype checklist

### Static text / display

- [ ] Heading levels are sequential (h1 -> h2 -> h3; no skips).
- [ ] Color contrast >= 4.5:1 (or 3:1 for large text per
      `wcag-color-contrast`).
- [ ] Decorative-only images have empty `alt=""`; meaningful images have
      descriptive `alt`.
- [ ] Information conveyed by color alone is also conveyed another way
      (text, icon, pattern; SC 1.4.1).

### Interactive - single trigger

- [ ] Native `<button>` / `<a href>` used (no `<div onclick>`).
- [ ] Visible focus indicator at >= 3:1 contrast vs. background.
- [ ] Activatable via Enter (and Space for `<button>`).
- [ ] Accessible name matches visible label (or is announced via
      `aria-label` / `aria-labelledby` if no visible label).
- [ ] On press: announces state change if applicable (e.g. toggle button
      announces `aria-pressed`).
- [ ] Loading / disabled states programmatically conveyed
      (`aria-disabled` / `aria-busy`).

### Interactive - form input

- [ ] Has a `<label for="...">` OR `aria-labelledby` referencing a visible
      label.
- [ ] Required fields marked via `required` (native) AND a non-color cue.
- [ ] Validation errors conveyed via `aria-invalid="true"` plus an error
      message linked via `aria-describedby`.
- [ ] On invalid submit: focus moves to the first invalid field.
- [ ] Autocomplete attributes set per WCAG 2.2 SC 1.3.5
      (`autocomplete="email"`, `"name"`, etc.).
- [ ] Placeholder is NOT used as the only label.

### Interactive - multi-state (disclosure / accordion / tabs)

- [ ] `aria-expanded` reflects open/closed state on the trigger.
- [ ] `aria-controls` references the controlled region's `id`.
- [ ] Keyboard interaction matches the [APG pattern][apg]:
  - Disclosure: Enter/Space toggles.
  - Accordion: Tab between headers; Enter/Space toggles.
  - Tabs: Tab to active tab; Left/Right to navigate; Home/End.
- [ ] Hidden content uses the `hidden` attribute or `display: none`
      (NOT `visibility: hidden` or `opacity: 0`, which leave the content
      focusable).

[apg]: https://www.w3.org/WAI/ARIA/apg/patterns/

### Interactive - overlay (modal / drawer / popover)

(See `wcag-keyboard-navigation` references/focus-trap.md for the 6-step
pattern.)

- [ ] `role="dialog"` (modal) OR `role="alertdialog"` (interrupt).
- [ ] `aria-modal="true"` for modals.
- [ ] `aria-labelledby` references the dialog's title.
- [ ] On open: focus moves into the dialog.
- [ ] Tab cycles within the dialog; doesn't escape to the page.
- [ ] Escape closes (for non-destructive dialogs).
- [ ] On close: focus returns to the triggering element.
- [ ] Outside content is `inert` (or pre-inert focusable cycle).

### Composite (combobox, date picker, multi-select)

(See `aria-authoring-patterns`.)

- [ ] Match the matching APG pattern's full keyboard model.
- [ ] `aria-expanded` on the trigger.
- [ ] `aria-controls` linking trigger to the popup.
- [ ] `aria-activedescendant` (when not moving DOM focus) OR moves DOM
      focus into the popup.
- [ ] Selected state announced via `aria-selected` (listbox) or
      `aria-checked` (tree).
- [ ] Type-ahead works (typing a letter focuses matching item).

### Live region

- [ ] Container has `role="status"` (polite) or `role="alert"` (assertive)
      OR `aria-live="polite"` / `"assertive"`.
- [ ] Container exists in the DOM **before** content is inserted (live
      regions only announce changes; pre-mounted with content suppresses
      the first announcement).
- [ ] Content updates are detected - for SPA frameworks, ensure the render
      produces a real DOM mutation rather than a virtual-DOM-only update.

### Layout / navigation

- [ ] Landmarks declared: `<header>` / `<main>` / `<nav>` / `<footer>` /
      `<aside>`. (One `<main>` per page.)
- [ ] Skip-to-main-content link as the first focusable element.
- [ ] Pagination controls have `aria-label` (e.g. "Pagination").
- [ ] Breadcrumb has `aria-label="Breadcrumb"` and `aria-current="page"`
      on the current page.

## Step 3 - Add per-component customization

Beyond the archetype defaults, the spec may declare:

- **Custom keyboard shortcuts** - verify SC 2.1.4 (Character Key Shortcuts).
- **Animation / motion** - verify SC 2.3.3 and respect
  `prefers-reduced-motion`.
- **Auto-rotating content** (carousel, ticker) - pause / play control;
  SC 2.2.2 (Pause, Stop, Hide).
- **Time-limited interactions** (countdown timer) - pause / extend control;
  SC 2.2.1 (Timing Adjustable).

## Step 4 - Emit the artifact

Manual-verification items must be emitted as **concrete keystrokes and
expected announcements** - never as a bare skill name. The artifact ships
into the user's repo and has to be runnable by a tester holding only that
file. Baseline commands (per the [NVDA user
guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html) and
[Apple VoiceOver](https://www.apple.com/accessibility/mac/vision/); same set
as SKILL.md Step 3):

| Action | NVDA + Firefox (Windows) | VoiceOver + Safari (macOS) |
|---|---|---|
| Next heading | `H` | `VO` (Ctrl+Option) + `Cmd` + `H` |
| Next form field | `F` | `VO` + `Cmd` + `J` |
| Read next / previous item | `Down` / `Up` arrow | `VO` + `Right` / `Left` arrow |
| Enter focus mode on a field | `Enter` | (automatic) |
| Activate the focused control | `Enter` | `VO` + `Space` |
| Element list overlay | - | `VO` + `U` (web rotor) |

A step passes when the announcement identifies the element type, reads the
visible label verbatim, and conveys state and position-in-set where
applicable.

### Markdown checklist (for spec / PR review)

```markdown
## A11y Checklist - `<ComponentName>`

**Archetype:** Interactive - overlay (modal)

### Required (must pass before merge)

- [ ] Modal has `role="dialog"` and `aria-modal="true"`.
- [ ] Modal title is `aria-labelledby`-referenced.
- [ ] On open: focus moves to first focusable inside modal.
- [ ] Tab cycles within modal; outside content is `inert`.
- [ ] Escape closes; focus returns to trigger.
- [ ] Close button has accessible name "Close" or "Dismiss".
- [ ] Focus indicator on close button at >= 3:1 contrast.

### Per-component (this design adds)

- [ ] Confirmation modal's "Delete" button has `aria-describedby`
      linking to the warning text.
- [ ] On confirm: live region announces "Deleted" via
      `aria-live="polite"`.

### Verification

- Automated: axe-core scan with `dialog` rule enabled.
- Manual (NVDA + Firefox, Windows): press `Enter` on the trigger -
  NVDA announces "Confirm delete, dialog"; `Tab` cycles inside the
  dialog and never reaches page content; `Escape` closes and focus
  returns to the trigger, announced as "Delete, button".
- Manual (VoiceOver + Safari, macOS): `VO`+`Space` on the trigger,
  `VO`+`Right arrow` to walk the dialog contents, `Escape` to
  close - same expected announcements.
- Code review: against the checklist above.
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
    instructions: >-
      NVDA + Firefox (Windows): Tab to "Delete", press Enter.
      NVDA must speak "Deleted" from the aria-live="polite" region
      without focus moving. VoiceOver + Safari (macOS): VO+Space on
      "Delete"; same announcement expected.
```

## Anti-patterns

| Anti-pattern                                    | Why it fails                                                       | Fix |
|-------------------------------------------------|---------------------------------------------------------------------|-----|
| Generic checklist for all components            | Static text doesn't need keyboard checks; modal does.              | Per-archetype checklist; pick once. |
| Checklist created post-implementation           | A11y becomes a retrofit; bugs found late.                          | Build the checklist from the spec, before implementation. |
| Marking items "won't fix" without rationale     | Loss of institutional knowledge; same item resurfaces.             | Document each waiver with a date + reviewer initials. |
| One mega-checklist per component (50+ items)    | Reviewer fatigue; rubber-stamping.                                  | Per-archetype defaults; only add custom items the design demands. |

## References

- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
- W3C ARIA Authoring Practices - [apg][apg].
- Related: `wcag-keyboard-navigation`, `wcag-color-contrast`,
  `aria-authoring-patterns`, `a11y-violation-gate`.
