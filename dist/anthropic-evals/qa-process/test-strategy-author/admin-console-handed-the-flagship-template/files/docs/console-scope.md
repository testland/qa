# Refund console - scope note

**Duration:** 6 weeks from 2026-09-21. **Team:** Marta Kelic, Devlin Roy.
**Users:** ~30 support agents, internal only, SSO behind the corporate IdP.

Surfaces:

1. **Issue refund** - an agent selects an order and issues a full or partial
   refund. This calls the live payment provider against the customer's real card
   or bank account. The provider gives us no sandbox on that endpoint; every
   call from the console is a production call.
2. **Refund history search** - agents look up past refunds by order or customer.
3. **Agent action log** - every refund attempt is written to an append-only log
   that Finance exports monthly for the reconciliation pack.
4. **CSV export** - Finance downloads the month's refunds.

Deployment: one internal box, deployed by CI on merge to main. Nothing in the
console is reachable from the public internet.

Finance's two requirements for the reconciliation pack, sent 2026-09-18:

- A refund must never be issued twice against the same order.
- The action log must never lose an entry, including for a refund attempt the
  provider rejected or timed out on.

Marta's note, 2026-09-19: both of those are covered - see the refund tests and
the action-log tests, all green.
