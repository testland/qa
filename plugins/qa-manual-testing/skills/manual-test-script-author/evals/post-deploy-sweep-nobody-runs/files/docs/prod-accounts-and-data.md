# Production verification accounts

The on-call uses a ring-fenced sandbox merchant that sits in production but
settles to a dummy ledger. Nothing done under it moves real money, and
nothing outside it should be touched during a deploy sweep.

| Item              | Value                                             |
|-------------------|---------------------------------------------------|
| Login             | oncall.smoke@paylane.example                      |
| Password          | 1Password entry `prod-smoke-login`                |
| Merchant          | `Sandbox Merchant (SBX-9)` in the merchant switcher|
| Second merchant   | `Sandbox Merchant (SBX-10)` - for switcher checks |
| Known transaction | reference `TXN-SBX-000117`, 42.00 USD, settled    |
| Known payout      | `PO-SBX-0042`, 1,204.75 USD, status Paid          |
| Report to spot-check | "Daily settlement" - has data every day        |
| Notification inbox| oncall.smoke@paylane.example (real mailbox)       |

The release version is printed in the footer of every page as `build: <sha>`
and is also on the deploy message in #deploys.

The nightly settlement batch runs at 02:10 UTC. Nothing that depends on it
can be verified during a daytime deploy.

Refunds on the sandbox merchant are safe. Refunds on any other merchant are
real customer money.
