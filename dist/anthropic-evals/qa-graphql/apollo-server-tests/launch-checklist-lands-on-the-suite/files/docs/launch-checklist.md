# Public launch - things I want covered before I sign off

Hana Okoye, 2026-09-16. Target date 2026-10-01.

1. A query asking for `orders(first: -3)` comes back as a client error with our
   own error code on it, not as a 500 and not as an empty list.
2. A client that sends its 101st operation inside one minute on the same API key
   gets a 429 back. We turned the limiter on last month and nobody has seen it
   work.
3. Schema introspection does not answer on the production build. Meridian's
   security review found it on in September and I want it held down.
4. An operation carrying a bearer token that expired ten minutes ago is rejected
   rather than served. This is the one I would lose sleep over.
5. A query naming a field that does not exist does not come back with a
   suggestion telling the caller what the real field is called.
6. `orderUpdated` actually reaches a subscribed client when an order's status
   changes. The mobile team is shipping on this in 3.6.
