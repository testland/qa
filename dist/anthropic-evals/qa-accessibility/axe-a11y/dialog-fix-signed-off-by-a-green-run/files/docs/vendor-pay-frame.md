# `#pay-frame` - hosted card entry

The vendor's card form renders inside `#pay-frame`, proxied through our own
domain at `/pay/card` so their session cookies work. Same origin as far as the
browser is concerned, so anything scanning the page walks into it - but every
byte inside it is authored and deployed by the vendor.

- 2026-03-11  asked the vendor to fix the markup their frame renders. Declined.
- 2026-07-29  asked again with the ticket reference. Declined again, in writing.
- Migration off the hosted form is on the roadmap for H1 next year. No date.
