# Structured handoff field, same 100 tickets, same run

The reply carries a JSON handoff block that our routing service parses. The
`is-json` assertion in promptfooconfig.yaml validates it against
`schema/handoff.json`. This assertion is deterministic; the grading model is
not involved.

| variant | valid | invalid | failure mode on the invalid ones           |
|---------|-------|---------|--------------------------------------------|
| A       | 100   | 0       | —                                           |
| B       | 71    | 29      | trailing prose sentence appended after `}`  |

The routing service drops a handoff it cannot parse and the ticket falls back
to the unassigned queue.
