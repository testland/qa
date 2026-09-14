# Keyboard sweep — /checkout — 2026-09-11 — Nadia O.

Method: Chrome 141, 1440x900 viewport, keyboard only, Tab from the page
heading through submit. After each Tab the bounding box of the focused element
and of every fixed / sticky overlay was read from the devtools box model.

Overlay bands, viewport coordinates (y from the top, viewport is 900 tall):

| Overlay              | top | bottom | note                                   |
|----------------------|-----|--------|----------------------------------------|
| sticky site header   |   0 |     72 | always present                         |
| cookie consent strip | 744 |    836 | present until dismissed; most sessions |
| fixed action bar     | 836 |    900 | always present, holds Pay and Back     |

Findings, each measured at the moment the element took focus:

| Id | Element         | focused box (top..bottom) | overlaps                  |
|----|-----------------|---------------------------|---------------------------|
| F1 | `#card-number`  | 58..102                   | sticky site header 58..72 |
| F2 | `#promo-code`   | 848..888                  | fixed action bar 848..888 |
| F3 | `#billing-zip`  | 300..344                  | none                      |
| F4 | `#save-card`    | 760..780                  | cookie consent 760..780   |
| F5 | `#gift-message` | 690..760                  | cookie consent 744..760   |

Per-finding notes:

- **F1** — Tab from `#email` lands here. The top 14px of the field, including
  the top edge of its focus ring, sits behind the header. The rest of the field
  and its caret are visible.
- **F2** — Tab from `#card-cvc` lands here. Nothing of the field is visible; the
  action bar is opaque `#ffffff` with a top border. Nadia only found it by
  reading `document.activeElement` in the console.
- **F3** — fully visible, nothing over it. Logged because the focus ring is
  `outline: 1px solid #d4d4d4` against the `#ffffff` field background, which
  Nadia measured at 1.27:1 and could not see on her laptop in daylight.
- **F4** — the "save this card" checkbox. Entirely behind the consent strip,
  which is opaque. Visible only in sessions where the user already dismissed
  the strip on a previous visit.
- **F5** — the gift-message textarea. Its bottom 16px sits behind the consent
  strip; the first two lines, the label and the top of the focus ring are all
  visible and the caret is visible while typing on line one.
