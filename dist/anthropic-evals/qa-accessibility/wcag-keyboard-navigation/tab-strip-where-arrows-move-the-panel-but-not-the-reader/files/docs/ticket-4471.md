# TICKET-4471 — analytics tab strip, keyboard

Two reports, merged.

## 4471-a — Norbridge Health, NVDA 2025.2 / Chrome 141

> I land on Overview and press the right arrow. The numbers underneath change —
> I can tell because the table read differently when I went and found it — but
> the reader keeps saying "Overview, tab, one of seven". I never know which tab
> I am on unless I go and read the panel.

Reproduced in-house on the dashboard and on the two other strips that mount the
same module.

## 4471-b — internal, support lead, keyboard-only

> Once I am on the strip I am stuck on it. Tab does nothing — not once, not
> held down. The only way I get to the chart is with the mouse, and the mouse is
> the thing my wrist will not do.

## Reply from the front-end lead

> 4471-b is not a bug, it is the pattern. A tab strip is meant to be one stop
> and the arrows are how you move inside it, so Tab is suppressed on purpose —
> that line has a comment on it and a test. He should be using arrows. If we
> really want him at the chart in one press, take the strip out of the tab
> order altogether and he lands straight on the panel.

## Reply from the a11y consultant

> For 4471-a, put `aria-live="assertive"` on the panel wrapper. Then every time
> the arrow changes the selection the reader announces the new content and she
> knows where she is. One attribute, no logic change, and it fixes the report
> she actually filed.
