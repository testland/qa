# TC-15 only works if somebody else ran TC-14 first

## Problem Description

Our regression pack is run by a rotating team in three timezones, and cases get
picked up individually from a queue rather than run in order. `TC-15` opens with
"Continue with the booking created in TC-14", which means whoever draws it either
has to find and run TC-14 first, or has to go looking for whatever booking the
previous shift happened to leave behind.

Last cycle it was drawn by someone who did neither. She picked a booking from the
list, changed a seat, and passed the case. We later found she had been on a fully
flexible fare, which skips the part of the flow we actually wanted covered.

There is a second, slower failure. Nothing in the case ever gives the old seat
back. Over a few months the good seats on the staging flight have been taken up
one by one by past runs, and the step that says to choose a better seat now has
almost nothing left to choose. The environment only rebuilds weekly.

We want a case that stands on its own, that covers the flow we intended, and that
does not consume the environment a little more every time it runs.

## Output Specification

Produce one markdown document at exactly
`manual/TC-15-seat-change-standalone.md` containing:

1. A seat-change case that a tester can draw from the queue and run without
   having run, or found, anything else first.
2. Everything that must be true before the first step, using the bookings, flight
   and seats in the attached files - including which fare the case requires and
   why the tester must not substitute another.
3. The exact seat the passenger starts in and the exact seat they move to, plus
   for each step the single thing observed that decides pass or fail.
4. Whatever is needed so the case leaves the environment able to run it again
   next week.
5. A place to record failures.

Out of scope: rewriting TC-14, automating the case, and anything to do with
check-in or boarding passes at the gate.

## Input Files

Extract the following files before beginning.

=============== FILE: manual/TC-14-book.md ===============
# TC-14 - Book a flight

1. Search VG204.
2. Pick a fare.
3. Enter passenger details.
4. Pay.
5. Check the confirmation.

=============== FILE: manual/TC-15-seat-change.md ===============
# TC-15 - Change seat

Continue with the booking created in TC-14.

1. Open Manage booking.
2. Open the seat map.
3. Pick a better seat.
4. Confirm the change goes through.
5. Check the passenger is told.

=============== FILE: manual/test-data.md ===============
# Staging booking data

Site: https://staging.vergo-air.example
Manage-booking sign-in needs the booking reference plus the passenger's
surname.

## Seeded bookings on flight VG204, 14 Sep 2026, LHR-FCO

| Reference | Passenger        | Fare            | Seat assigned at booking |
|-----------|------------------|-----------------|--------------------------|
| QWK4RT    | ADEBAYO/FUNKE    | Economy Light   | 24C                      |
| QWK4RU    | LINDQVIST/ERIK   | Economy Light   | 24D                      |
| QWK4RV    | MORALES/CARMEN   | Economy Flex    | 23A                      |
| QWK4RW    | HAAS/JOHANNA     | Economy Flex    | 23B                      |
| QWK4RX    | PATEL/RESHMA     | Business        | 2A                       |

Seat changes are free on Economy Flex and Business. On Economy Light a seat
change is chargeable and the passenger is taken through a card payment step
(staging accepts test card 4111 1111 1111 1111, any future expiry, CVC 123).

## Extra-legroom rows on VG204

Row 12 is the exit row. Current occupancy on staging:

| Seat | State                                   |
|------|-----------------------------------------|
| 12A  | occupied - left by a previous test run  |
| 12B  | occupied - left by a previous test run  |
| 12C  | occupied - left by a previous test run  |
| 12D  | occupied - left by a previous test run  |
| 12E  | free                                    |
| 12F  | free                                    |

## Environment housekeeping

Staging is rebuilt from the reference data set every Sunday at 02:00 UTC.
Between rebuilds nothing releases a seat automatically. The staging admin
tool at `/staging-admin/bookings` has a "Revert booking to seeded state"
action that restores a booking's original seat and clears any change fee;
it takes a few seconds.

## Notifications

Staging email is captured at https://staging.vergo-air.example/mailtrap and
arrives within about two minutes. Seat-change confirmations quote the new
seat and the flight number.
