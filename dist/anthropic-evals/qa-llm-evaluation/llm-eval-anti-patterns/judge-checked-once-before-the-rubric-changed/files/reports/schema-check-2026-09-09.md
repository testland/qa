# Structured handoff block, same 100 tickets, same run

Every reply carries a JSON handoff block that the routing service parses. The
`is-json` assertion in the case file validates it against `schema/handoff.json`.
This assertion is deterministic and no grading model is involved in it.

| variant | valid | invalid | failure mode on the invalid ones            |
|---------|-------|---------|---------------------------------------------|
| A       | 100   | 0       | —                                            |
| B       | 71    | 29      | trailing prose sentence appended after `}`   |

The routing service drops a handoff it cannot parse and the ticket falls back
to the unassigned queue, where the median wait last month was 9 hours.
