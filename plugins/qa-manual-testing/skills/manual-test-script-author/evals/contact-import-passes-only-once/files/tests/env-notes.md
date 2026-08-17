# CRM test environment notes

App: https://app.orbitcrm.example

## Tenants

| Tenant        | Use                                                        |
|---------------|------------------------------------------------------------|
| acme-sandbox  | QA. Safe to write to. Wiped on the 1st of each month.       |
| acme-demo     | Sales demos. Never write to this tenant.                    |

## Logins

| Login                      | Role       | Sees the Import menu |
|----------------------------|------------|----------------------|
| qa.sales@orbitcrm.example  | Sales User | no                   |
| qa.admin@orbitcrm.example  | Data Admin | yes                  |

## Import rules (current release)

- `email` is required and is the unique key for a contact.
- A row with an empty `email` is rejected and listed on the import error
  report, which is linked from the finished-import screen.
- A row whose email matches a contact that already exists - including one
  created earlier in the same file - is merged rather than created. Merging
  overwrites existing fields with the incoming non-empty values.
- Deduplication is on by default and can be switched off on the upload
  screen. Leave it on.
- The finished-import screen shows three counts: created, merged, rejected.

## Undoing an import

Every upload creates a batch. Imports > (select the batch) > "Delete imported
records" removes the records that batch created and nothing else. There is no
other way to reverse an import short of the monthly wipe.
