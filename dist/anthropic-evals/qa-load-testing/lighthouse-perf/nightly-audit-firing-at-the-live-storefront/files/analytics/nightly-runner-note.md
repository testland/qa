# Growth analytics -> storefront eng, 2026-09-02

Subject: whatever is hitting the site at 02:00

Four things, in order of how much they annoy me.

1. GA4 logged 31 sessions last month from 3.87.x.x between 02:00 and 02:06 UTC.
   Two pageviews each, zero conversions, 100% bounce. They are in the
   denominator of the storefront conversion rate I report to the board every
   Monday. I have been manually filtering them since June and I would like to
   stop.

2. Segment fires `Product List Viewed` on /collections/new-arrivals. Those 31
   nights are in the warehouse and they are in the training set for the
   recommendation model, which now believes somebody browses outerwear at 2am
   and never buys anything.

3. Cloudflare rate-limited that IP twice in August (rule: >20 requests / 10s
   from one source). Both nights the audit still reported a 1.9s LCP, which is
   the fastest number we have ever recorded and which nobody can reproduce.

4. Heads up on /checkout since I hear you want to measure it: an anonymous
   request to /checkout gets a 302 to /cart unless the session already has a
   cart. There is no cart on a cold browser profile. Whatever you point at that
   URL will be measuring /cart.
