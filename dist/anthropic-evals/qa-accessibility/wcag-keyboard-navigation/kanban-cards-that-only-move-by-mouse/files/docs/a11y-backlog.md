# A-31 breakdown — Deniz K., planning doc

Closing A-31 means closing all four of these. I do not want to explain to a
customer why three of the four are fixed.

## B-1 — Moving a card between columns

Today a card only changes column by being dragged with a pointer. There is no
other way to do it anywhere in the product. Reported by two enterprise
accounts and by our own tester.

## B-2 — Opening a card

Clicking a card opens its detail panel. Our tester can land on a card now but
says pressing Enter on one does nothing; she has to reach for the mouse. The
handler in the module looks right to me, so I assume this is a wiring job.

## B-3 — Extending the tab numbering to the rest of the board

Background for anyone who missed it: in focus mode the columns are laid out
right-to-left while the markup still emits them left-to-right, so tabbing used
to walk the board in an order that matched nothing on screen. The contractor
gave every card an explicit tab position (1, 2, 3, ... across the board in
visual order) and the tester's follow-up video shows the order correct for the
first time. Video is in the ticket.

I want that same treatment applied to the column headers, the overflow menus
and whatever keyboard controls come out of B-1, so the whole board has one
predictable order instead of half of one. This is the item I care most about —
it is the only change so far with proof attached.

## B-4 — Signing the contract

The signature step on the contract-signing flow asks the signer to draw their
signature on the pad with a pointer. A keyboard-only user cannot draw a
signature. Deniz wants this made operable by keyboard like the rest.
