# What #4180 and #4186 changed

**#4180 — copy refresh.** Every page title, headline and sub-headline on the
home, pricing, checkout and confirmation pages was rewritten by marketing. No
behaviour change intended and none reviewed as such.

**#4186 — design system.** Primary buttons and call-to-action links moved from
`class="btn btn--primary"` to `class="btn btn--primary btn--lg"`. Presentation
only.

**Order model, in #4180.** The order record's identifier field is `id`. An
earlier draft of the model called it `reference`; that name was dropped before
the PR merged and the templates were updated to match. Checkout, payment and
the order record itself were not otherwise touched.

**Prices.** Unchanged. Starter £19, Team £49, and the seeded two-item cart
still totals £48.20.
