# Web bugs - open, as of 2026-09-12

| Id       | Title                                                      | State  | Opened     | Owner        |
|----------|------------------------------------------------------------|--------|------------|--------------|
| WEB-1180 | Nav items wrap to a second line in Firefox at 1280 wide     | open   | 2026-09-04 | @web-platform|
| WEB-1174 | Coupon rejection shifts the promo row by 2px                | fixed  | 2026-08-28 | @checkout    |
| WEB-1169 | Settings sidebar scrollbar overlaps the API key column      | open   | 2026-08-22 | @platform-ui |
| WEB-1155 | Webkit renders the danger button label 1px lower            | open   | 2026-08-11 | @web-platform|
| WEB-1142 | Email dark-variant header reads black-on-black in Outlook   | open   | 2026-07-30 | @growth      |

Notes from the 2026-09-10 triage: WEB-1180 reproduces on every Firefox run on
`main` and on every branch cut from it. Nobody is on it. WEB-1155 reproduces on
Webkit only. Both were opened from manual passes, not from the visual job.
