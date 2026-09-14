# Finding 17 — modal dialogs — Halvern Group, 2026-08-28

Scope: `Edit board name` dialog and `Delete board` confirmation, boards
product, web. Severity: high. Response due 2026-09-30.

## V-1 — Focus leaves the container when reversing

Observed: with focus on the first control inside either dialog, pressing
Shift and Tab together moves focus to content behind the dialog. The user is
then operating the page underneath while the dialog is still displayed.

## V-2 — Neither dialog closes with the Escape key

Observed: Escape has no effect on either dialog. Users familiar with the
convention report the dialog as frozen.

## V-3 — The launching control is not hidden from assistive technology

Per our house checklist item A-9, the control that opened the dialog, and the
page container behind it, must be marked `aria-hidden="true"` for the duration
that the dialog is displayed. Confirm this is in place.

## V-4 — Tab reaches a control that cannot be activated

Observed: in the `Delete board` confirmation, the primary "Delete permanently"
button is disabled until the board name is typed into the confirm field. It is
nonetheless reached by Tab, and pressing Enter on it does nothing. The same
dialog contains a hidden "restore from trash" link that is also reached.
