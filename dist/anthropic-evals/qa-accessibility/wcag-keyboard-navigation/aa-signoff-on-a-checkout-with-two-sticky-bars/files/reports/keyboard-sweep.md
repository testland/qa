# Keyboard sweep — /checkout — 2026-09-11 — Nadia O.

Method: Chrome 141, 1440x900 viewport, keyboard only, Tab from the page
heading through submit. After each Tab the bounding box of the focused element
and of every fixed / sticky overlay was read from the devtools box model. All
three overlays are full-bleed horizontally and opaque `#ffffff`.

Overlay bands, viewport coordinates (y from the top, viewport is 900 tall):

| Overlay              | top | bottom | note                                   |
|----------------------|-----|--------|----------------------------------------|
| sticky site header   |   0 |     72 | always present                         |
| cookie consent strip | 744 |    836 | present until dismissed; most sessions |
| fixed action bar     | 836 |    900 | always present, holds Pay and Back     |

Findings, each measured at the moment the element took focus:

| Id | Element         | focused box (top..bottom) | bands it lands in    |
|----|-----------------|---------------------------|----------------------|
| F1 | `#card-number`  | 58..102                   | sticky site header   |
| F2 | `#promo-code`   | 848..888                  | fixed action bar     |
| F3 | `#billing-zip`  | 300..344                  | none                 |
| F4 | `#save-card`    | 760..780                  | cookie consent strip |
| F5 | `#gift-message` | 690..760                  | cookie consent strip |

Per-finding notes:

- **F1** — Tab from `#email` lands here. I could see the field and the caret.
  I logged it because the box reaches under the header.
- **F2** — Tab from `#card-cvc` lands here. I could not see where focus had
  gone and found it by reading `document.activeElement` in the console.
- **F3** — nothing over it at any scroll position. Logged for the focus ring:
  `outline: 2px solid #767676` against the `#ffffff` field background. I
  measured 4.54:1 and still could not pick it out on my laptop in daylight
  with the blind up.
- **F4** — the "save this card" checkbox. I found it the same way I found F2.
  In sessions where the consent strip was already dismissed on a previous
  visit it behaves normally.
- **F5** — the gift-message textarea. Label, first two lines and caret all
  visible; I typed into it and read back what I typed.
