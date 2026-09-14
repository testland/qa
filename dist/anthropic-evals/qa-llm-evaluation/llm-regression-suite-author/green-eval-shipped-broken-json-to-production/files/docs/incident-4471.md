# INC-4471 — routing pipeline stalled 9h after PR #1180

**Window:** 2026-09-08 09:12 to 18:05 UTC. 2,140 tickets unrouted.

**Cause:** `/summarise-ticket` began returning its JSON object wrapped in a
markdown code fence. The routing service calls `JSON.parse` on the body and
threw on every request.

**Detection:** a support lead noticed the queue depth. No alert fired. The
regression suite ran on PR #1180 and reported 8 of 8.

**Contributing:** `sum-json-refund-fields` in the same captured run appended a
conversational sentence after the closing brace. That one never reached
production because the deploy was rolled back first. The parser would have
thrown on it too.

**Rollback:** prompt reverted 18:05.

**Endpoint shape, for reference:** three of the eight summariser cases return a
JSON object the routing service parses and acts on. The other five return prose
that a human reads in the queue UI; nothing machine-reads those.
