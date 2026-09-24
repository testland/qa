# Farrow Digital - @acme/primitives, findings summary, 2026-09-08

Tested with NVDA 2025.2 / Firefox and VoiceOver / Safari 18.

## Verified by hand

1. **Collapsible** (the "Shipping options" trigger). Announced as "Shipping
   options, button, not pressed". Activating it does reveal the region, but
   nothing in the announcement tells the user the region opened or closed.
   Testers could not tell whether activating it had done anything.
2. **Counter** (the quantity stepper on a cart line). Announced as "spin
   button, 3". Tab goes straight from "Decrease quantity" to "Increase
   quantity" - the value itself is never reached - and Up and Down arrows do
   nothing anywhere in the control. There is no way to change the quantity
   without a pointer.
3. **Menu trigger** (the "Account" button). Announced as "Account, menu".
   Opening it produces a plain list of three links, and the screen reader
   reports the menu as containing no items at all.

## Flagged in the automated pass, NOT verified by hand

4. **Toggle** (the "Email digest" control).
5. **Hint** (the tooltip on "Save").

We ran out of hours. Treat 4 and 5 as unconfirmed.
