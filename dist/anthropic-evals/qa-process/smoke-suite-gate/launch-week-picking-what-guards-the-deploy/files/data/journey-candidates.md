# Trellis journeys from the nightly regression suite — measured week 36

Runtime is the measured wall clock for that journey on the gate box, one worker.
Traffic is distinct beta users in the last 7 days.

| #  | Journey                                      | Weekly users | Runtime | Side effects                              | Notes |
|----|----------------------------------------------|-------------:|--------:|-------------------------------------------|-------|
| 1  | Marketing home page loads                     | 41,000       | 8s      | none                                      | covered by the existing check |
| 2  | Sign in with email and password               | 12,400       | 34s     | creates a session                         | covered by the existing check |
| 3  | Sign in with Google SSO                       | 3,900        | 41s     | creates a session                         | |
| 4  | Dashboard loads with live data                | 11,900       | 38s     | none                                      | covered by the existing check |
| 5  | Book a courier                                | 9,700        | 52s     | creates a shipment                        | the product's reason to exist |
| 6  | Track a shipment by number                    | 8,600        | 29s     | none                                      | uses seeded shipment TRL-SEED-2 |
| 7  | Pay for a booking                             | 7,200        | 57s     | takes payment                             | |
| 8  | Booking confirmation page                     | 7,100        | 22s     | none                                      | uses seeded booking TRL-SEED-9 |
| 9  | Search the address book                       | 5,400        | 31s     | none                                      | |
| 10 | Search the address book sorted by last used   | 900          | 30s     | none                                      | |
| 11 | Invoice PDF export                            | 2,100        | 220s    | none                                      | renders 12 months of invoices |
| 12 | Bulk CSV import of 5,000 addresses            | 340          | 190s    | writes 5,000 address rows                 | |
| 13 | Password reset by email                       | 1,800        | 95s     | sends email, changes a password           | polls a real mailbox for the link |
| 14 | Admin bulk-delete of users                    | 38           | 44s     | deletes user rows                         | |
| 15 | Referral invite send                          | 1,200        | 61s     | sends email                               | |
| 16 | Webhook replay console                        | 210          | 73s     | re-delivers webhooks to customer endpoints | |
| 17 | Change plan (upgrade)                         | 480          | 66s     | changes a subscription, charges a card    | |
| 18 | Download a shipping label PDF                 | 6,900        | 26s     | none                                      | uses seeded shipment TRL-SEED-2 |
| 19 | Notification bell opens                       | 9,100        | 18s     | none                                      | front end only, no server call |
| 20 | Help centre article loads                     | 3,300        | 12s     | none                                      | separate CMS, deploys on its own schedule |
| 21 | Settings page loads                           | 4,800        | 24s     | none                                      | |
| 22 | Sign out                                      | 10,200       | 15s     | ends a session                            | |
