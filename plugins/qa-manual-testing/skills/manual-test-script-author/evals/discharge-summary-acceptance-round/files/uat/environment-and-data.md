# St Brigid's UAT environment

URL: https://stbrigid.uat.carevault.example
Release under acceptance: v3.4.0 (shown bottom-right of the login screen)
Sessions are booked for Ward 4B only.

## Accounts

| Login              | Person                | Role                      |
|--------------------|-----------------------|---------------------------|
| s.adeyemi.uat      | Sister Adeyemi        | Ward Manager, Ward 4B     |
| dr.okonkwo.uat     | Dr Okonkwo            | Consultant, Ward 4B       |
| bed.mgr.uat        | Bed Management        | Read-only, all wards      |

Passwords are handed over in the session, not stored in this file.

## Seeded patients (Ward 4B, refreshed each Monday 06:00)

| Record   | Name          | Bed    | Notes                                       |
|----------|---------------|--------|---------------------------------------------|
| 4B-1102  | Aoife Byrne   | 4B-06  | 3 active medications, GP practice registered|
| 4B-1103  | Tomas Varga   | 4B-09  | no GP practice on file                      |
| 4B-1104  | Nia Roberts   | 4B-11  | already discharged last Monday              |

## Printing and post

The ward printer on 4B is `PRN-4B-01`. GP letters in UAT are not posted;
they land in the practice mailbox viewer at
https://stbrigid.uat.carevault.example/uat-tools/practice-mailbox
usually within five minutes.
