# Proposal: retire the RUM contract at the 2026-10-01 renewal

Author: Ilya D. / web platform
Date: 2026-09-09

We pay $2,100 a month for a real-user monitoring vendor. Our CI audit job
already reports LCP, INP and CLS on every pull request, for free, on the same
three routes the vendor charges us for. I pulled last month's numbers from the
vendor dashboard and put them next to what CI reported over the same period:

| Route    | CI median LCP | RUM p75 LCP | Delta | CI INP | RUM INP | CI CLS | RUM CLS |
|----------|---------------|-------------|-------|--------|---------|--------|---------|
| /        | 2210 ms       | 2290 ms     | 3.6%  | 150 ms | 160 ms  | 0.04   | 0.04    |
| /search  | 2560 ms       | 2640 ms     | 3.1%  | 190 ms | 210 ms  | 0.03   | 0.03    |
| /listing | 2100 ms       | 2180 ms     | 3.8%  | 120 ms | 130 ms  | 0.05   | 0.05    |

Three routes, three metrics, and the two instruments agree inside four percent
on every cell. We are paying $25,200 a year for a second opinion that is the
same opinion.

What I want to do:

1. Give notice and let the contract lapse on 2026-10-01.
2. While we are in there, set the CI thresholds to exactly the p75 numbers in
   the table above, so the gate reflects what users actually get instead of the
   round numbers somebody typed in eighteen months ago.
3. Skip the audit on draft pull requests. Nobody reads the result until the PR
   is marked ready and it is the single slowest check we run.

I know the counter-argument is that lab and field measure different things. I
have heard it. My answer is the table: if they measured different things, the
table would not look like that.
