# CRM contact import - test run notes

Tester: external contractor (D.R.)
Date: Tuesday
Build: import-svc 2.9.0-rc3, staging

## What I did

Tested the CSV contact import. Found 7 bugs.

## Notes

- Uploaded the 50-row sample file. Worked.
- Uploaded a file with a duplicate email. It created two contacts. Probably
  wrong, the spec talks about merging.
- Tried a 60,000-row file. Upload page timed out after about 4 minutes.
  Tried twice, same both times.
- File with a UTF-8 BOM: first column header not recognised, all rows
  rejected.
- Semicolon-delimited file (European Excel export) is not detected. Rejected
  with "malformed".
- Empty file: 500 error page.
- File where the phone column has +44 numbers: leading + stripped on save.
- Column mapping screen: if you go back and forward the mapping resets.
- Ran out of time. Staging import queue was stuck for a while in the middle,
  had to ask someone to restart the worker, that took a chunk of the morning.

## Environment

Staging. Import worker restarted once by the platform team.

## Time

Started 09:15, finished 12:30.
