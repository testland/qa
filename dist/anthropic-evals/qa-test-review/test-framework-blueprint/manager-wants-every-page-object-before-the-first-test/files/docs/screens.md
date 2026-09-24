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

Routing note: screens 1-9 are nine routes served by one React route entry.
The global nav and the confirm-modal render on all fourteen.

Browser tests written against any of these to date: none.
