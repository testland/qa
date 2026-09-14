# #eng-quality, yesterday

**@vp-eng:** platform is at 91 and billing is at 60. Same company, same
language. Explain.

**@platform-lead (Ines):** 91 is the number our board reads off the Stryker HTML
report - the "mutation score based on covered code" row, not the headline one.
We also narrowed `mutate` to `src/domain/**` last quarter because the adapters
were dragging it down. Nothing dishonest, it is just the figure that tracks the
code we actually test.

**@vp-eng:** and billing's 60?

**@billing-lead (me):** 60 is whatever our CI prints from the json reporter. I
have not checked which row it is. Our `mutate` glob is still `src/**/*.js`.

**@platform-lead (Ines):** for what it is worth we also stopped counting the ones
we agreed no test can ever catch. There were about six of those in the payment
adapter. Never wrote down why, though - that was Rami and he is at Datadog now.

**@vp-eng:** 80 is the policy line either way. Someone give me a yes or a no by
Friday.
