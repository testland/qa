# pricing-api / platform operations log, August 2026

2026-08-04  PRICING-704 shipped. The Node suite asserted `seat-tier-v2` off for
            trial accounts; the Python suite had no trial-account case at all.
            Trial accounts were quoted the enterprise price sheet for 4h 20m.
            Cause: the two flag-state lists disagreed.

2026-08-06  main red 06:40-09:15. billing-api, not us - their contract tests
            evaluate against the staging flag environment. Someone moved the
            `invoice-pdf-v2` beta segment at 06:38. Four PRs blocked. No code
            change was involved on either side.

2026-08-11  PRICING-611 reopened. Same shape as 704: the Node suite asserted a
            region segment the Python suite did not have. Caught in review.

2026-08-19  main red 14:05-16:50. billing-api again - the staging key was
            rotated during a routine credential sweep and every contract test
            failed to initialise.

2026-08-27  Our seat-count segment was renamed in the dashboard, `seats_gt_50`
            to `seats-gt-50`. Neither suite noticed. Found from a support
            ticket on 2026-09-02.
