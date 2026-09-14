# Assertion outcomes exported from the CI dashboard

Window: 2025-07-14 to 2026-09-11. 412 days, both matrix legs, 3 URLs per run.

| Assertion                 | Job leg              | Evaluated | Failed |
|---------------------------|----------------------|-----------|--------|
| largest-contentful-paint  | lighthouse (desktop) | 1236      | 11     |
| cumulative-layout-shift   | lighthouse (desktop) | 1236      | 8      |
| largest-contentful-paint  | lighthouse (mobile)  | 1236      | 11     |
| cumulative-layout-shift   | lighthouse (mobile)  | 1236      | 8      |
| total-blocking-time       | lighthouse (mobile)  | 0         | 0      |

The eleven LCP failures are all on /search (six of them the autocomplete bundle
in #2214, five the hero image in #2388). The eight layout-shift failures are
split /search 5, /book/step-1 3. Both legs list the same dates against the same
run numbers.
