# Refund console - scope note

**Duration:** 6 weeks, starting 2026-09-21. **Team:** Marta Kelic, Devlin Roy.
**Users:** ~30 support agents, internal only, SSO behind the corporate IdP.

Surfaces:

1. **Issue refund** - an agent selects an order and issues a full or partial
   refund. This calls the live payment provider against the customer's real card
   or bank account. There is no sandbox mode in the console; production only.
2. **Refund history search** - agents look up past refunds by order or customer.
3. **Agent action log** - every refund attempt is written to an append-only log
   that Finance exports monthly for the reconciliation pack.
4. **CSV export** - Finance downloads the month's refunds.

Deployment: one internal environment, one box, deploy by CI on merge to main.
No canary, no staged rollout, no synthetic monitoring, no load testing
infrastructure, no design-system a11y pipeline. Nothing in the console is
reachable from the public internet.

Finance has asked, for the reconciliation pack, that a refund never be issued
twice for the same order and that the action log never lose an entry.
