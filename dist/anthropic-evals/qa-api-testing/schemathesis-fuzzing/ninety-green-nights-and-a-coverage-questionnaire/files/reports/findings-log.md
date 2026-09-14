# Generated-case findings, rolling 12 months

| # | Date       | Operation             | Reported                        | State  |
|---|------------|-----------------------|---------------------------------|--------|
| 1 | 2026-10-02 | listPatients          | 500 on page=500                 | fixed 2026-10-04 |
| 2 | 2026-11-19 | getPatient            | 404 body had no `error` field   | fixed 2026-11-21 |
| 3 | 2026-12-08 | createPatient         | 201 body omitted `status`       | fixed 2026-12-09 |
| 4 | 2026-02-14 | listAppointments      | 200 returned `data: null`       | closed, see note A |
| 5 | 2026-03-03 | createPatient         | 409 returned, not documented    | closed, see note B |
| 6 | 2026-04-27 | getPatient            | `mrn` returned 24 chars         | closed, see note C |
| 7 | 2026-05-30 | listPatients          | `Content-Type` had no charset   | fixed 2026-06-02 |
| 8 | 2026-06-11 | listAppointments      | 200 returned items as objects   | closed, see note D |
| 9 | 2026-07-08 | createPatient         | 400 body shape undocumented     | fixed 2026-07-10 |

Notes:

- **A** - `data: null` is what the service returns for an empty day and the team
  agreed that is correct behaviour. The document says `data` is a required
  array. Closed 2026-02-16 as "document to be amended". No amendment has been
  raised.
- **B** - the 409 is real and intentional; it fires on a duplicate MRN. Closed
  2026-03-05 as "document to be amended". No amendment has been raised.
- **C** - `mrn` is 24 characters for records imported from the legacy system.
  The document says 20. Closed 2026-04-29 as "document to be amended". No
  amendment has been raised.
- **D** - appointments are objects, not strings. The document says strings.
  Closed 2026-06-15 as "document to be amended". No amendment has been raised.

## Run history

90 consecutive green nights, most recent 2026-09-13, so the streak begins
2026-06-16. Each of the four notes above was closed the same way on the day it
was closed: the affected operation was taken out of the run. Note D, the last of
them, was closed on 2026-06-15.
