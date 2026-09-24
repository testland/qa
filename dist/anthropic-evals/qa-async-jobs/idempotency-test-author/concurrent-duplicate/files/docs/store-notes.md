# Reservation store - operation notes

The store is backed by Redis in production; the in-repo version keeps the same
contract.

| call | round trips | exclusion between concurrent callers |
|---|---|---|
| `read(key)` | 1 | none |
| `write(key, value)` | 1 | none, last write wins |
| `claim(key)` | 1 | yes - compiles to `SET key <token> NX`, so exactly one caller gets `acquired: true` |
| `settle(key, value)` | 1 | n/a, only the holder of the claim calls it |

A `read` followed by a `write` is two independent round trips. Nothing stops a
second caller reading in the gap between them.

`claim` returns `{ acquired, joined }`. A caller that did not acquire gets
`joined`, a promise resolving to whatever the holder passes to `settle`, so the
loser of a race returns the winner's result rather than issuing a second refund.
