# RFC 002 - One app or several

**Status:** open. Opened 2026-09-09. No decision.

The dashboard and the marketing site are one Next.js app today because it was
the fastest thing to build. If the dashboard becomes a separate deployable, the
routes, the auth boundary and everything a browser test would navigate through
change shape.

**Blocked on:** whether the first enterprise pilot needs an on-prem dashboard.
We find out at the pilot call, currently pencilled for 2026-10-15.
