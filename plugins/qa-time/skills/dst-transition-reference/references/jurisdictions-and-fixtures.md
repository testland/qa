# Per-jurisdiction DST rules and test-data fixtures

Deep reference for `dst-transition-reference` SKILL.md. Consult when
choosing which zones to cover and for refreshable per-region fixture
timestamps.

## Per-jurisdiction differences

| Region | DST behaviour |
|---|---|
| US (most) | Spring-forward 2nd Sun March; fall-back 1st Sun November |
| EU | Last Sun March; last Sun October (one hour earlier) |
| Australia (most of NSW/VIC) | First Sun October; first Sun April (Southern hemisphere - reversed) |
| Australia (QLD, NT, WA, NT) | No DST |
| Japan, China, India | No DST |
| Russia | Abolished DST in 2011 |
| Iran | Abolished DST in 2022 |
| Mexico | Abolished mainland DST in 2022 |
| Brazil | Abolished DST in 2019 |

Per IANA: rules change frequently. Test against current zoneinfo,
not assumptions.

## Test data fixtures

Useful canonical timestamps per region (refresh against IANA):

| Region | Spring-forward 2026 | Fall-back 2026 |
|---|---|---|
| America/New_York | 2026-03-08 02:00 → 03:00 EDT | 2026-11-01 02:00 → 01:00 EST |
| Europe/London | 2026-03-29 01:00 → 02:00 BST | 2026-10-25 02:00 → 01:00 GMT |
| Australia/Sydney | 2026-10-04 02:00 → 03:00 AEDT | 2026-04-05 03:00 → 02:00 AEST |

These dates **change** year to year (some); commit a current fixture
and refresh annually.
