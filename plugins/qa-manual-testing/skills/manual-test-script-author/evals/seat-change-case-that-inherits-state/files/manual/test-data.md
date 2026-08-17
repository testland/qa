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
