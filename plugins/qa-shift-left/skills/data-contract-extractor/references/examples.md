# data-contract-extractor - worked examples

Three end-to-end examples. The five contract sections, the YAML output
format, the extraction steps, and the gap-flagging pattern live in
[SKILL.md](../SKILL.md).

## Example 1: PRD -> contract

Input (data PRD excerpt):

> "We're building an `orders` table. One row per order. Updated
> within 1 hour of order placement. Statuses: placed, shipped,
> delivered, cancelled. Discount up to 100%. Payment methods: card,
> bank, paypal. Owned by the data platform team."

Output: see the Output format YAML in SKILL.md (the example mirrors this PRD).

## Example 2: minimal source

Input: "We need a `users` table. Email and name."

Output:

```markdown
## Contract gaps (HUMAN INPUT REQUIRED)

| Section       | Field                | Question                                       |
|---------------|----------------------|------------------------------------------------|
| schema        | types                | `email VARCHAR(?)` `name VARCHAR(?)`?           |
| schema        | pii                  | Direct (email, name)? Confirm.                  |
| schema        | uniqueness           | Email unique per user? Or shared (e.g. household)? |
| schema        | PK                   | `users.user_id` implied but not stated.         |
| freshness     | cadence              | Real-time on signup? Daily?                     |
| volume        | range                | Expected user count?                            |
| ownership     | team                 | Who owns this?                                  |

A 2-line PRD generates a 7-line gap list. Fill the gaps before
authoring the contract.
```

## Example 3: refactor of existing dataset

Input: an undocumented `events` table, used by 5 dashboards.
Discovered via `git grep` of the warehouse client code.

Output:

The agent reads the SQL queries hitting `events` and infers the
*observed* contract - column references, status values used in
WHERE clauses, recency expectations from `INTERVAL` filters. Then
it produces a contract draft with a header note:

```markdown
**Status:** observed-from-usage (NOT producer-attested).
The producer team must review and amend; this contract is the
consumers' best-effort reverse-engineering.
```

Until the producer attests, the contract is one-sided - useful for
the consumer's tests, NOT a binding agreement.
