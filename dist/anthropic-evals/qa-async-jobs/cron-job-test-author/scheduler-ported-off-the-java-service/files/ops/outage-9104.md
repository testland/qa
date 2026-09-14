# Worker outage 8-11 September

- 2026-09-08 19:10 UTC - deploy of 0.8.4 wedged the worker on boot. Rolled back
  by hand on the 11th.
- 2026-09-11 02:00 UTC - worker back up. Boot-time replay ran.
- 2026-09-12 - Analytics raised a ticket about the warehouse partitions over the
  outage days. Open with platform, nobody has looked at it. Nobody has asked us
  about sessions at all.
- 2026-09-18 - Tax reconciled with the filing partner. No file held for the 8th
  and none for the 9th. Both refiled by hand; the partner has raised a
  late-filing penalty for the 8th and we are arguing it.
- The properties file that held the Java service's per-trigger behaviour for a
  missed run is not in the retention hold. Nobody wrote those settings down
  anywhere else, and the two people who would have known have left.
