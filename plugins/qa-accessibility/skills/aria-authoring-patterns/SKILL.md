---
name: aria-authoring-patterns
description: "Use when building or reviewing a custom interactive widget with no native HTML equivalent (combobox, dialog, menu, tabs, tree and more). Gives the W3C ARIA Authoring Practices pattern: required roles and states, keyboard interaction and common violations."
---

# aria-authoring-patterns

## Overview

The W3C ARIA Authoring Practices Guide (APG) is the canonical
reference for **how** to build accessible custom widgets - patterns
where native HTML doesn't have a single matching element
([apg-patterns][apg]).

[apg]: https://www.w3.org/WAI/ARIA/apg/patterns/

The APG documents 31 patterns; each one specifies:

- The required `role` attribute.
- Required and optional `aria-*` states (e.g. `aria-expanded`,
  `aria-selected`, `aria-current`).
- The full keyboard-interaction model (Tab / Arrow keys / Enter /
  Escape / Home / End / Type-ahead).
- DOM structure conventions.
- Common pitfalls.

## When to use

- Authoring a custom widget (Combobox, Tabs, Tree, Carousel, etc.).
- Reviewing a third-party UI library's component for ARIA
  correctness.
- Adding ARIA to an existing widget that was hand-rolled without
  it.
- Configuring assertions in `axe-a11y`
  (or its pa11y reference) to enforce per-pattern
  conventions.

## The first rule of ARIA

The APG (and WAI more broadly) consistently emphasizes:

> **No ARIA is better than bad ARIA.** Native HTML elements with
> built-in semantics are preferred over custom widgets whenever
> possible.

In practice:

| Native element                                | Don't replace with                                  |
|-----------------------------------------------|-----------------------------------------------------|
| `<button>`                                    | `<div role="button">` - same semantics, more code, easier to break. |
| `<input type="checkbox">`                     | Custom checkbox unless visual constraints demand it. |
| `<a href>`                                    | `<div onclick="navigate(...)">`.                    |
| `<select>`                                    | Custom listbox UNLESS multi-select with rich content per option. |
| `<input type="radio">`                        | Custom radio group.                                  |

When the visual design demands a custom widget, follow the matching
APG pattern exactly.

## Canonical patterns (APG)

The 31 patterns documented per [apg-patterns][apg]:

### Form controls

| Pattern          | When to use                                         | Native fallback                             |
|------------------|-----------------------------------------------------|---------------------------------------------|
| Button            | Trigger an action.                                   | `<button>` - almost always.                  |
| Checkbox          | Two-state binary; or three-state (mixed).           | `<input type="checkbox">`.                  |
| Combobox          | Searchable / filterable select with autocomplete.    | `<select>` for plain selection only.        |
| Disclosure         | Show/hide content; one-way reveal.                   | `<details>` / `<summary>`.                   |
| Listbox           | Multi-select OR rich-content single-select.          | `<select>` for plain.                        |
| Menu / Menubar    | Application menus (File / Edit / View bar).         | (No native; APG required.)                   |
| Menu Button       | Button that opens a menu.                            | (No native; APG required.)                   |
| Radio Group       | Mutually-exclusive option set.                       | `<input type="radio" name="x">`.            |
| Slider            | Single-value within a range.                          | `<input type="range">`.                      |
| Slider (Multi-Thumb) | Range selection.                                  | (No native; APG required.)                   |
| Spinbutton        | Numeric input with increment/decrement controls.     | `<input type="number">`.                     |
| Switch            | On/off toggle, semantically distinct from checkbox.  | (No native; APG required.)                   |

### Containers / navigation

| Pattern          | When to use                                         |
|------------------|-----------------------------------------------------|
| Accordion         | Vertically-stacked list of headers; each expands.    |
| Breadcrumb        | Hierarchical-location indicator.                      |
| Carousel          | Cycle through groups of equivalent content.          |
| Dialog (Modal)    | Overlay requiring user interaction. (See `wcag-keyboard-navigation` references/focus-trap.md.) |
| Alert Dialog      | Modal that interrupts to convey urgency.             |
| Tabs              | Switch between sibling content sections.             |
| Toolbar           | Group of controls (buttons, dropdowns).             |
| Tree View         | Hierarchical navigation.                              |
| Treegrid          | Hierarchical data grid (table rows that expand).     |
| Window Splitter   | Resize between two panes.                             |

### Feedback / indicators

| Pattern          | When to use                                         |
|------------------|-----------------------------------------------------|
| Alert             | Important programmatically-determined message.        |
| Feed              | Dynamic stream of articles.                           |
| Grid              | 2D widget for navigating tabular UI elements.         |
| Meter             | Scalar measurement within a known range.             |
| Tooltip           | Brief contextual hint on hover/focus.                 |

### Content

| Pattern          | When to use                                         |
|------------------|-----------------------------------------------------|
| Landmarks         | Navigation regions (`<nav>`, `<main>`, etc.).         |
| Link              | Navigation to a different resource.                   |
| Table             | Tabular data (use `<table>`).                          |

## Per-pattern essentials

The APG's per-pattern documentation is detailed; for each pattern
this skill highlights the **load-bearing essentials**.

### Combobox

```html
<label for="combo">Choose a fruit</label>
<input
  id="combo"
  role="combobox"
  aria-expanded="false"
  aria-controls="combo-listbox"
  aria-autocomplete="list"
  aria-activedescendant=""
/>
<ul id="combo-listbox" role="listbox" hidden>
  <li id="opt-1" role="option" aria-selected="false">Apple</li>
  <li id="opt-2" role="option" aria-selected="false">Banana</li>
</ul>
```

| Required ARIA            | Why                                              |
|--------------------------|--------------------------------------------------|
| `role="combobox"`        | Identifies the input as a combobox.              |
| `aria-expanded`          | Tracks open/closed state.                        |
| `aria-controls`          | Links to the listbox ID.                          |
| `aria-autocomplete`      | `none` / `inline` / `list` / `both`.            |
| `aria-activedescendant`  | Tracks the focused option without moving DOM focus. |

### Tabs

```html
<div role="tablist" aria-label="Settings sections">
  <button role="tab" id="tab-1" aria-selected="true" aria-controls="panel-1" tabindex="0">General</button>
  <button role="tab" id="tab-2" aria-selected="false" aria-controls="panel-2" tabindex="-1">Privacy</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">...</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>...</div>
```

| Keyboard         | Behavior                                           |
|------------------|----------------------------------------------------|
| Tab              | One tabstop for the whole tablist (only the active tab is `tabindex="0"`). |
| Left/Right arrow | Navigate between tabs.                             |
| Home / End       | First / last tab.                                  |
| Enter / Space    | Activate (or auto on focus per implementation).    |

### Disclosure (Show/Hide)

```html
<button aria-expanded="false" aria-controls="disclosure-1">More details</button>
<div id="disclosure-1" hidden>... content ...</div>
```

The simplest pattern; canonical native equivalent is `<details>` /
`<summary>` - use that unless the visual design demands the button
form.

### Tooltip (per SC 1.4.13)

```html
<button aria-describedby="tt-1">Save</button>
<div id="tt-1" role="tooltip" hidden>Save the current document</div>
```

| Behavior                                                   |
|------------------------------------------------------------|
| Show on hover OR focus.                                    |
| Dismissable via Esc (per SC 1.4.13).                       |
| Hoverable - user can move pointer to tooltip text.         |
| Persistent until pointer / focus leaves OR Esc dismisses.  |

(See `wcag-color-contrast` SC
1.4.13 for the three conditions.)

### Site navigation: disclosure, not menu roles

A header with dropdowns is not an application menu. The APG disclosure
navigation example "does not use the menu role because it does not
provide the complex functionality that assistive technologies expect"
from a menu ([apg-disclosure-nav][apg-dnav]). `role="menubar"`,
`menu` and `menuitem` promise arrow-key navigation inside the menu and
switch screen readers into menu mode, and plain links in a list do
neither. Build each dropdown as a disclosure:

```html
<nav aria-label="Main">
  <ul>
    <li>
      <button type="button" aria-expanded="false" aria-controls="sub-docs">Docs</button>
      <ul id="sub-docs" hidden>
        <li><a href="/docs/install">Install</a></li>
        <li><a href="/docs/api" aria-current="page">API</a></li>
      </ul>
    </li>
    <li><a href="/pricing">Pricing</a></li>
  </ul>
</nav>
```

| Key or event | Behaviour (per the APG example) |
|---|---|
| Enter / Space on the button | Toggles the list and `aria-expanded`; hover alone is not enough |
| Tab / Shift+Tab | Moves through buttons and links in DOM order |
| Escape while open | Closes the list and moves focus to its button |
| Current page | The link carries `aria-current="page"`, not only a CSS class |

Test it with keyboard events and roles: press Enter on the button,
expect `aria-expanded="true"` and the links visible, press Escape,
expect the list hidden and focus on the button, and expect no element
with `role="menuitem"` in the header.

### Toggle buttons: one label or one state, never both

The APG button pattern: "Important: it is critical the label on a
toggle does not change when its state changes"
([apg-button][apg-btn]). A button that flips its text *and*
`aria-pressed` is announced as "Unpin, toggle button, pressed", which
contradicts itself. Pick one:

```html
<!-- Option A: fixed label, state in aria-pressed -->
<button type="button" aria-pressed="false">Bold</button>

<!-- Option B: changing label, no aria-pressed (a plain action button) -->
<button type="button">Show details</button>
```

In Playwright, assert the state on the stable name:
`await expect(page.getByRole('button', { name: 'Bold', pressed: true })).toBeVisible()`.

### Live regions: present before the message, polite by default

MDN: a live region must be in the DOM before the change it announces;
assistive technology starts watching it when it appears, so a region
created together with its text is often not read at all
([mdn-live-regions][mdn-live]). Put an empty region in the initial
markup and only change its text later:

```html
<div id="announcer" role="status"></div>   <!-- in the page from the start -->
```

```js
function announce(text) {
  document.getElementById('announcer').textContent = text;  // the region already exists
}
```

| Role | Politeness | Use for |
|---|---|---|
| `status` | polite: announced at the next pause | Confirmations: "Draft saved", "3 results" |
| `alert` | assertive: interrupts speech | Errors and time-critical warnings only |

A `role="alert"` on every confirmation interrupts what the user is
listening to. Test that the region exists on load
(`getByRole('status')` before any action) and contains the message
after the action.

[apg-dnav]: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
[apg-btn]: https://www.w3.org/WAI/ARIA/apg/patterns/button/
[mdn-live]: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions

## ARIA states reference

The most-used `aria-*` states across patterns:

| State                  | Use                                                    |
|------------------------|--------------------------------------------------------|
| `aria-expanded`        | Disclosure / Accordion / Combobox / Menu Button.       |
| `aria-selected`        | Listbox / Tab.                                          |
| `aria-checked`          | Checkbox / Radio.                                       |
| `aria-pressed`          | Toggle button (keep its label fixed; see above).        |
| `aria-current`          | Current item in a set (page in pagination, item in breadcrumb). |
| `aria-controls`         | Element that this trigger controls.                     |
| `aria-labelledby`       | Reference to the labelling element.                    |
| `aria-describedby`      | Reference to a description element (tooltip, hint).    |
| `aria-live`             | Live region; `polite` / `assertive` / `off`.           |
| `aria-invalid`          | Form field validation state.                            |
| `aria-required`         | Form field required (with native `required` for forms). |
| `aria-disabled`         | Functionally disabled but in tab order (vs. `disabled` attribute which removes from tab order). |
| `aria-modal`            | Dialog modal flag; see `wcag-keyboard-navigation` references/focus-trap.md. |

## Common ARIA failures

| Failure                                                  | Why                                                                | Fix |
|----------------------------------------------------------|---------------------------------------------------------------------|-----|
| `<div role="button">` without keyboard handlers           | Custom button needs `tabindex="0"` AND Enter/Space handlers.       | Use `<button>` OR add both. |
| `aria-label` on a `<div>` that has visible text label     | Redundant; `aria-label` overrides the visible text for screen readers (becomes confusing). | Use `aria-labelledby` referencing the visible text element. |
| `aria-hidden="true"` on a focusable element               | Element is hidden from screen readers but still in tab order - broken state. | If you want to hide, also remove from tab order. |
| Forgetting `role="tab"` / `role="tabpanel"` pairs          | Screen reader doesn't announce the relationship.                   | Pair every tab with a panel via `aria-controls` / `aria-labelledby`. |
| Hand-rolled combobox without `aria-activedescendant`       | Arrow keys don't announce options.                                 | Implement `aria-activedescendant` or move actual DOM focus. |
| `role="presentation"` on a meaningful container            | Removes semantics; sometimes used to "fix" a layout issue but breaks structure. | Don't override structure to fix layout; fix layout. |

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Inventing a custom pattern not in the APG                      | No screen-reader convention; users can't form expectations.       | Match an APG pattern exactly OR fall back to native HTML. |
| Mixing native and ARIA semantics (`<button role="link">`)       | Confusing - element behaves like a button but says it's a link.   | One or the other; native is preferred. |
| `role="menubar"` / `menuitem` on site navigation               | Promises application-menu keys that a list of links does not have. | Disclosure buttons with `aria-expanded` and plain links. |
| Toggle that changes its label and sets `aria-pressed`          | Announced as a contradiction ("Unpin, pressed").                  | Fixed label + `aria-pressed`, or changing label alone. |
| Creating a live region together with its message               | Screen readers miss the first message.                             | Empty region in the initial markup; change its text later. |
| `tabindex="3"` to control sequence                              | Positive tabindex creates fragile order.                           | DOM order + `tabindex="0"` for custom focusables. |
| Adding `aria-label` to every element "for accessibility"        | If the element has a visible label, `aria-label` overrides it. Many elements don't need a label at all. | Only add `aria-label` when there's no visible text label AND the element is interactive. |

## References

- [apg-patterns][apg] - W3C ARIA Authoring Practices Guide
  (canonical patterns).
- WAI-ARIA 1.2 Spec - https://www.w3.org/TR/wai-aria-1.2/
- [APG disclosure navigation example][apg-dnav] - why site
  navigation avoids menu roles; Escape and focus behaviour.
- [APG button pattern][apg-btn] - toggle buttons and `aria-pressed`.
- [MDN: ARIA live regions][mdn-live] - region before content;
  `status` vs `alert`.
- `wcag-keyboard-navigation` - Keyboard-interaction conformance underlying
  every APG pattern; its references/focus-trap.md is the Dialog pattern's
  focus-management deep dive.
- `axe-a11y` - scanners that detect
  ARIA misuse programmatically.
