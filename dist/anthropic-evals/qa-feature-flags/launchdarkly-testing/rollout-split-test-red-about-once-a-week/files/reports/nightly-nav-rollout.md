# nightly storefront-web job, test/nav-rollout.test.js

SDK bumped 2026-08-31 (7.0.1 to 7.0.4, patch release, no API change on our
side). `test/fixtures/ld-flags.json` last edited 2026-06-14. Dashboard rollout
for `nav-redesign` unchanged at 50/50 since 2026-06-11.

Over the last 60 nights, "the fifty-fifty rollout splits traffic evenly" has
failed 3 times: 2026-07-19 (466), 2026-08-14 (543), 2026-09-02 (534).

| date       | fifty-fifty rollout splits traffic evenly | user-1 is in the redesign bucket and user-2 is not |
|------------|-------------------------------------------|-----------------------------------------------------|
| 2026-08-28 | pass (treatment count 499)                | pass                                                |
| 2026-08-29 | pass (treatment count 503)                | pass                                                |
| 2026-08-30 | pass (treatment count 496)                | pass                                                |
| 2026-08-31 | pass (treatment count 488)                | FAIL  expected classic, got redesign (user-2)       |
| 2026-09-01 | pass (treatment count 511)                | FAIL  expected classic, got redesign (user-2)       |
| 2026-09-02 | FAIL (treatment count was 534)            | FAIL  expected classic, got redesign (user-2)       |
| 2026-09-03 | pass (treatment count 492)                | FAIL  expected classic, got redesign (user-2)       |
| 2026-09-10 | pass (treatment count 507)                | FAIL  expected classic, got redesign (user-2)       |
