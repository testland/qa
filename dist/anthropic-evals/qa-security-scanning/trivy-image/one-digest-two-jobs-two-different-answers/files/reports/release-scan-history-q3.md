# release-scan outcomes, Q3 to date (pulled 2026-09-13 17:20)

41 releases. 35 of the release scans matched the verdict the pull-request job
had recorded for the same digest. 6 did not — in every one of those the release
scan was the stricter of the two.

| Release | Digest        | Merged     | Released   | Release scan found                  |
|---------|---------------|------------|------------|-------------------------------------|
| 4.10.4  | sha256:9b2f01 | 2026-07-02 | 2026-07-11 | 1 CRITICAL (openssl), fix available |
| 4.11.0  | sha256:44ce7a | 2026-07-19 | 2026-07-22 | 2 HIGH (glibc, curl), fix available |
| 4.11.3  | sha256:0d81be | 2026-08-05 | 2026-08-14 | 1 HIGH (libxml2), fix available     |
| 4.11.6  | sha256:e70a92 | 2026-08-20 | 2026-08-24 | 1 HIGH (libtasn1), fix available    |
| 4.12.0  | sha256:aa3c15 | 2026-09-01 | 2026-09-04 | 1 CRITICAL (glibc), fix available   |
| 4.12.2  | sha256:c41e7b | 2026-09-13 | pending    | 1 CRITICAL (libcurl4), fix available|

Median gap between merge scan and release scan across all 41: 4 days.
