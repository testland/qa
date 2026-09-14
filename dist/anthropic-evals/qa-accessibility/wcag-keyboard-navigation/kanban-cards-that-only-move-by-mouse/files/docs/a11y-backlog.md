# A-31 breakdown — Deniz K., planning doc

Closing A-31 means closing all four of these. I do not want to explain to a
customer why three of the four are fixed.

## B-1 — Moving a card between columns

Today a card only changes column by being dragged with a pointer. There is no
other way to do it anywhere in the product. Reported by two enterprise
accounts and by our own tester.

## B-2 — Opening a card

Clicking a card opens its detail panel. Our tester says she cannot reach a card
at all to open one. The contractor added `role="button"` and `aria-label` to
the cards last sprint; the report did not change.

## B-3 — The card overflow menu

The three-dot menu on each card is a `<div role="button" tabindex="0">` with a
key handler. Our tester reaches it and it opens when she presses Enter. A
second tester on a different machine says it does not open for her; she says
she "pressed the button" and nothing happened. We have not reproduced it.

## B-4 — Signing the contract

The signature step on the contract-signing flow asks the signer to draw their
signature on the pad with a pointer. A keyboard-only user cannot draw a
signature. Deniz wants this made operable by keyboard like the rest.
