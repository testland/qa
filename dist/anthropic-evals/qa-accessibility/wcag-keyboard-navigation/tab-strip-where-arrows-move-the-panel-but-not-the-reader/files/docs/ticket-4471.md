# TICKET-4471 — analytics tab strip, keyboard

Two reports, merged.

## 4471-a — Norbridge Health, NVDA 2025.2 / Chrome 141

> I land on Overview and press the right arrow. The numbers underneath change —
> I can tell because the table read differently when I went and found it — but
> the reader keeps saying "Overview, tab, one of seven". I never know which tab
> I am on unless I go and read the panel.

Reproduced in-house. Pressing the right arrow updates the rendered strip and
the panel. The reader is still parked on the Overview button.

## 4471-b — internal, support lead, keyboard-only

> Seven Tab presses from the page title before I reach the chart. On the
> settings page the equivalent strip is one press and then arrows. Why is the
> dashboard different?

## Thread reply from the front-end lead

> Half of this is arrow-key cleverness fighting the browser. Make every tab a
> normal tab stop, delete handleKeydown, and everything is reachable with Tab
> like every other control on the page. One less custom behaviour to maintain.
> I can have it up this afternoon.
