# CVE-2023-45853 — assessment

Date: 2025-08-14
Assessed by: R. Adeyemi (security)
Approved by: R. Adeyemi
Re-review due: 2026-03-01

The overflow is in `minizip`, a contrib utility in the zlib source tree. The
Debian `zlib1g` runtime package does not build or ship `minizip`, and nothing in
the application image links against it. Debian has classified this as a
minor issue and has published no update for `zlib1g`.

Status: not exploitable in this image. Suppressed at the gate pending re-review.
