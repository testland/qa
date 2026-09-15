# Release 8.4.0 - deploy and rollback record

| Event | When | By |
|---|---|---|
| 8.4.0 deployed to production | 2026-08-10 22:10 | release automation |
| Rolled back to 8.3.6 | 2026-08-14 23:40 | on-call, on BP-2291 |

## What 8.4.0 contained

- **SAFE-77 fix** - the medication summary truncated the allergy list at five entries;
  a sixth and subsequent allergies were not displayed. Three confirmed occurrences,
  classified Critical, open since 2026-07-02. This was the reason 8.4.0 was expedited.
- Appointment reminder wording changes (copy only).
- Dependency bump for the charting library.

**No change was made to the letter download path in 8.4.0.** The counter-signature gate
on clinical letters has behaved the same way since 7.2 (November 2025) and was not
touched by this release.

## Standing risk note

8.3.6 does not contain the SAFE-77 fix. While production is on 8.3.6 the allergy list
truncation is live again. This is logged as an accepted risk pending re-release and has
to be reported to the safety review if it is still open on Thursday.
