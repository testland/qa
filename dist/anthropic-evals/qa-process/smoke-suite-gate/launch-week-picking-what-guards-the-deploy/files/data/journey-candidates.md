# Trellis journeys from the nightly regression suite — measured week 36

Runtime is the measured wall clock for that journey on the gate box, one worker.
Traffic is distinct beta users in the last 7 days.

| #  | Journey                                      | Weekly users | Runtime | Writes data | Notes |
|----|----------------------------------------------|-------------:|--------:|-------------|-------|
| 1  | Marketing home page loads                     | 41,000       | 8s      | no          | |
| 2  | Sign in with email and password               | 12,400       | 34s     | session only | covered by the existing check |
| 3  | Sign in with Google SSO                       | 3,900        | 41s     | session only | same destination as #2, different provider |
| 4  | Dashboard loads with live data                | 11,900       | 38s     | no          | covered by the existing check |
| 5  | Book a courier (the hero flow)                | 9,700        | 52s     | yes — creates a shipment | the product's reason to exist |
| 6  | Track a shipment by number                    | 8,600        | 29s     | no          | seeded shipment TRL-SEED-2 exists in every environment |
| 7  | Pay for a booking                             | 7,200        | 57s     | yes — takes payment | |
| 8  | Booking confirmation page                     | 7,100        | 22s     | no          | |
| 9  | Search the address book                       | 5,400        | 31s     | no          | |
| 10 | Search the address book sorted by last used   | 900          | 30s     | no          | same page as #9 with a query parameter |
| 11 | Invoice PDF export                            | 2,100        | 220s    | no          | renders 12 months of invoices |
| 12 | Bulk CSV import of 5,000 addresses            | 340          | 190s    | yes         | |
| 13 | Password reset by email                       | 1,800        | 95s     | yes         | polls a real mailbox for the link |
| 14 | Admin bulk-delete of users                    | 38           | 44s     | yes — destructive | |
| 15 | Referral invite send                          | 1,200        | 61s     | yes — sends live email | |
| 16 | Webhook replay console                        | 210          | 73s     | yes         | |
| 17 | Change plan (upgrade)                         | 480          | 66s     | yes         | |
| 18 | Download a shipping label PDF                 | 6,900        | 26s     | no          | uses seeded shipment TRL-SEED-2 |
| 19 | Notification bell opens                       | 9,100        | 18s     | no          | front-end only, no server call |
| 20 | Help centre article loads                     | 3,300        | 12s     | no          | separate CMS, deploys on its own schedule |
| 21 | Settings page loads                           | 4,800        | 24s     | no          | |
| 22 | Sign out                                      | 10,200       | 15s     | session only | |
