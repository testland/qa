# Console screens - inventory taken 2026-09-09

| #  | Screen                   | Built from                            |
|----|--------------------------|---------------------------------------|
| 1  | Payouts list             | DataTable + filter chips              |
| 2  | Payouts / pending        | DataTable, state filter pinned        |
| 3  | Payouts / paid           | DataTable, state filter pinned        |
| 4  | Payouts / failed         | DataTable, state filter pinned        |
| 5  | Payouts / returned       | DataTable, state filter pinned        |
| 6  | Merchants list           | DataTable, different column set       |
| 7  | Merchants / in review    | DataTable, state filter pinned        |
| 8  | Merchants / restricted   | DataTable, state filter pinned        |
| 9  | Disputes list            | DataTable, different column set       |
| 10 | Payout detail            | DetailDrawer                          |
| 11 | Merchant detail          | DetailDrawer                          |
| 12 | Dispute detail           | DetailDrawer                          |
| 13 | Settings / team          | Form                                  |
| 14 | Sign in                  | Form                                  |

Screens 1-9 are the same DataTable component with a different column set and,
in seven cases, a pinned filter - the design system treats them as one screen
with nine routes. Screens 10-12 are the same DetailDrawer. The global nav and
the confirm-modal appear on all fourteen.

Nobody has yet written a browser test against any of them, so we have no
evidence about which parts are actually awkward to drive.
