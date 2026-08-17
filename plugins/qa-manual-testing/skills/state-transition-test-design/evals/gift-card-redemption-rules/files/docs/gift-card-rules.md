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
