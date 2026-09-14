# PR 812 - widen the catch-up window

One line: `CATCH_UP_WINDOW_MS` goes from 24 hours to 30 days.

Reasoning. The outage lasted just under three days and the replay only covered
the last twenty-four hours of it, so two days of work was simply dropped on the
floor and Tax found out from the partner rather than from us. Thirty days covers
any outage we have ever had, including the four-day one in 2024, and the worker
already knows how to replay - it did it correctly for the slots that fell inside
the window. This is a one-constant change and I would like it in before Thursday's
deploy so we are covered for the next one.
