# Accept log, 2026-09-09 14:00-14:05 UTC. No deploy in this window or the day around it.

| client session | connections opened in the 5 min | how each one ended                   |
|----------------|---------------------------------|--------------------------------------|
| s_4471         | 300                             | server close, code 1008, "session revoked" |
| s_9002         | 299                             | server close, code 1008, "session revoked" |
| s_1188         | 298                             | server close, code 1008, "session revoked" |
| s_0c7a         | 297                             | server close, code 1008, "session revoked" |
| everything else| 1-3                             | still open at the end of the window   |

617 sessions are in the first pattern, together 184,000 of the 187,000 accepts
in the window. Each of those sessions belongs to a user who changed their
password or signed out on another device: the gateway reads the stale token,
closes the connection, and the same client is back on the next second.

Oldest session in the pattern started 2026-08-27 and has not stopped since.
Support tickets that are probably this: "app kills my battery", "fan spins up
after I change my password", 41 of them open.
