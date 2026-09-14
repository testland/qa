# Public launch - things I want covered before I sign off

Hana Okoye, 2026-09-16. Target date 2026-10-01.

1. A query asking for `orders(first: -3)` comes back as a client error with our
   own error code on it, not as a 500 and not as an empty list.
2. A client that sends its 101st operation inside one minute on the same API key
   gets a 429 back. We turned the limiter on last month and nobody has seen it
   work.
3. A query nested past six levels is refused. That went in on the same branch as
   the limiter and I have never seen either of them fire.
4. A form-style POST from a page we do not control - the sort a browser will
   send without asking us first - does not get executed. Meridian's review
   raised this in September and I told them it was already handled.
5. A client that sends `first` as a string instead of a number gets a client
   error back and the resolver never runs. Ravi is convinced this one 500s.
6. `orderUpdated` actually reaches a subscribed client when an order's status
   changes. The mobile team is shipping on this in 3.6.
