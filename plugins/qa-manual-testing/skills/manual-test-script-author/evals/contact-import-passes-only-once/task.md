# The import case passes the first time and fails every time after

## Problem Description

`tests/TC-102-import.md` covers bulk contact import. It tells the tester to
upload the contacts file, verify the import completes successfully, and
spot-check a few records.

Nobody agrees on what "successfully" means. The importer skips some rows on
purpose and merges others, so the run always ends with fewer new contacts than
lines in the file, and testers have raised that as a defect twice. "Spot-check a
few records" means every tester checks different ones, and the two rows in the
file that actually break things are the two nobody thinks to open.

The case also only passes once. The contacts it creates stay in the tenant, so
the next run merges into them instead of creating them, the numbers come out
different, and the tester either marks it failed or quietly changes what they
expect. The sandbox is only wiped monthly.

Two testers last week also could not get as far as the upload screen at all,
because the login they were given cannot see the menu it lives on.

## Output Specification

Produce one markdown document at exactly `tests/TC-102-contact-import.md`
containing:

1. A rewritten import case that produces the same result on its second run as on
   its first.
2. Everything that must be true before the first step - which tenant, which
   login, which file - using the attached files.
3. The exact figures the tester compares the finished import against, derived
   from the contents of the attached file rather than described in words.
4. Named records to inspect and the exact value expected in each, chosen so the
   two risky rows are actually covered.
5. Whatever has to happen after the last step for the case to be runnable again
   tomorrow.
6. A place to record failures.

Out of scope: automating the case, the CSV export journey, and any change to the
import rules.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/TC-102-import.md ===============
# TC-102 - Contact import

1. Log in.
2. Upload the contacts file.
3. Verify the import completes successfully.
4. Spot-check a few records.

=============== FILE: fixtures/contacts-sample.csv ===============
first_name,last_name,email,company,job_title
Aiko,Tanaka,aiko.tanaka@meridian.example,"Meridian Freight, GmbH",Ops Lead
Ola,Nordstrom,ola.nordstrom@fjordline.example,Fjordline AS,Buyer
Ravi,Kumar,ravi.kumar@sunpeak.example,Sunpeak Labs,CTO
Ravi,Kumar,ravi.kumar@sunpeak.example,Sunpeak Labs,Chief Technology Officer
Marta,Oliveira,marta.oliveira@vertego.example,Vertego,Head of Sales
Tom,Byrne,,Byrne Plumbing,Owner
Chen,Wei,chen.wei@lumira.example,"Lumira Data, Inc.",Analyst
Zoe,Bakker,zoe.bakker@dunes.example,Dunes BV,Marketing

=============== FILE: tests/env-notes.md ===============
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
