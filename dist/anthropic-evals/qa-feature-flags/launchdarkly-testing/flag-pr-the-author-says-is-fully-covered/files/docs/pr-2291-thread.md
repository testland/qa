# PR 2291 - review thread

**@raul-m** - 2026-09-12 09:41

Good to have this in before the ramp. One thing before you stamp: everything in
`test/support/ld.js` is module level, so all six tests share one client and one
data source. In billing-service we build both inside a `beforeEach` so every
test starts from nothing. Can we do the same here? Five-line change and it
takes the whole class of cross-test bleed off the table.

**@sofia-r** - 2026-09-12 10:02

Happy either way. It is module level because that is how I found it in the
other repos, not because I had a reason. Say the word and I will move it into a
`beforeEach` in this PR, otherwise I will open a follow-up.

**@raul-m** - 2026-09-12 10:15

Leaving that to the second reviewer then. Everything else reads fine to me -
the setup line in each test matches the behaviour in the test name, and it is
green.
