# Finding 17 — modal dialogs — Halvern Group, 2026-08-28

Scope: `Edit board name` dialog and `Delete board` confirmation, boards
product, web. Severity: high. Response due 2026-09-30.

## V-1 — Focus stays where it was when the dialog opens

Observed: activating either trigger displays the dialog but leaves focus on the
page behind it. A screen-reader user is not told the dialog is there and has to
hunt for it; a sighted keyboard user Tabs through the page underneath first.

## V-2 — Neither dialog closes with the Escape key

Observed: Escape has no effect on either dialog. Users familiar with the
convention report the dialog as frozen.

## V-3 — The launching control is not hidden from assistive technology

Per our house checklist item A-9, the control that opened the dialog, and the
page container behind it, must be marked `aria-hidden="true"` for the duration
that the dialog is displayed, so that assistive technology cannot reach the
background. Confirm this is in place.

## V-4 — Dismissal behaviour is inconsistent between the two dialogs

Observed: the `Edit board name` dialog closes when the overlay behind it is
clicked. The `Delete board` confirmation does not. Per our house checklist item
A-14, overlay dismissal is recommended practice and should be consistent across
a product's dialogs. Confirm the same behaviour on the `Delete board`
confirmation.
