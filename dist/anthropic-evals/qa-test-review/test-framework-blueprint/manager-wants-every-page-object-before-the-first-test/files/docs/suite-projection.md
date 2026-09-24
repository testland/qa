# Suite projection - requested by @tomas, produced 2026-09-06

- Today: 4 tests, all unit, run by `node --test`. Zero browser tests.
- Critical journeys agreed with product: 7 - sign in, approve a payout, retry
  a failed payout, restrict a merchant, resolve a dispute, invite a team
  member, export a statement.
- Estimated end state on the current roadmap, end of Q1 2027: 55-70 browser
  tests plus an API tier of similar size. Nobody is projecting beyond that.
- Who uses this console: internal operations staff, one role, same
  permissions for all of them. Merchants never sign in here - they use the
  merchant portal, a separate product with its own team and its own tests.
- Engineers who will write tests: 3, all TypeScript.
