# Gift cards are paying for things they should not

## Problem Description

Our gift cards are printed in batches and sit on the rack by the tills until
somebody buys one, at which point the cashier activates it and loads the value
onto it. From then on the customer spends it at any till: the terminal deducts
the amount from the balance, and if the card does not have enough on it the
terminal declines the whole transaction - we do not part-pay and we do not let
a card go negative. A card spent down to nothing is still a valid card and can
be topped up again at any till, and a refund for something bought with a card
goes back onto the card it was paid with.

If a customer reports a card lost or stolen, the contact centre suspends it.
Suspension is reversible - people find them again - and while a card is
suspended the point of the exercise is that it buys nothing. A customer who
does not find it gets the balance moved onto a replacement card, which voids
the old one. Finance can also void a card outright, for fraud or for a batch
recall, and a voided card is dead permanently.

Two incidents opened this work. A card was taken off the rack before anybody
bought it and spent at a till in the same shop; it had never been activated
and it had no purchase behind it. And a card that had been reported stolen and
suspended on the Tuesday was accepted at a self-checkout on the Wednesday.

The current test pack has six cases: buy and activate a card, spend some of
it, spend the rest of it, top it up, suspend it, void it. They all pass.

## Output Specification

Produce `docs/gift-card-tests.md` containing:

1. The model the cases come from: for each situation a card can be in, what
   each of the eight things that can happen to it does, including any case
   where the same thing happening produces different results depending on the
   balance.
2. Numbered manual test cases with steps and per-step expected results. Every
   case states the card's starting situation and starting balance, and every
   step states the balance and the situation afterwards.

Card printing, the loyalty scheme, and the terminal's own hardware are out of
scope. Do not write code - these run against a till in the training store.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/gift-card-rules.md ===============
# Gift card rules - card services

## Situations a card can be in

| Situation | Till display | Contact centre display |
|---|---|---|
| Issued | "Card not active" | Not sold |
| Active | Balance | Active, balance, last used |
| Depleted | "Zero balance" | Active, zero balance |
| Suspended | "Card blocked" | Suspended on <date> by <agent> |
| Voided | "Card invalid" | Voided on <date>, reason |

## Things that can happen to a card

| Event | Where |
|---|---|
| activate | Till, when the card is sold |
| redeem | Till or self-checkout, for a purchase |
| reload | Till, adding value |
| refund-to-card | Till, returning goods paid for with the card |
| suspend | Contact centre |
| unsuspend | Contact centre |
| void | Finance, or automatically when a balance is moved off |
| transfer-balance | Contact centre, moving the balance to a replacement |

Eight events. Nothing else changes a card.

## Rules

- Cards on the rack are printed and inert until a cashier activates them.
- Redeeming for less than the balance leaves the card in play with less on it.
- Redeeming for exactly the balance empties it.
- Redeeming for more than the balance is declined in full; nothing is
  deducted and nothing is part-paid.
- A card with nothing on it is still a valid card: it can be topped up, and a
  refund can put money back on it.
- A suspended card buys nothing until the contact centre lifts the suspension.
- Moving a balance onto a replacement card voids the card it came from.
- Voided is permanent. Nothing brings a voided card back.
