# Proposal: collapse SessionTest into one journey test

Rosa M, 2026-09-11

We keep pretending these are four independent tests. They are not, and Karim's
single-method runs proved it on Thursday: `d` cannot pass on its own, because it
needs a signed-in user and only `c` produces one. The letter prefixes are us
admitting the dependency while keeping up the appearance of independence, and
the emulator split showed how thin that appearance is - the runner does not care
what we named things.

So let us stop pretending. One `@Test` called `signInJourney()` that does sign
in, then search, then asserts the chips, then asserts the rationale card, in the
order that works. Benefits:

- The nightly goes green tonight and stays green, split or not, because the
  whole journey lands on one device.
- No letter prefixes, so renames are safe again.
- It is one user journey, which is arguably what we should have written in the
  first place.
- Wall clock drops, because we stop restarting the activity four times.

Cost I can see: when it fails we get one red instead of four, and we have to
read the stack trace to find out which step broke. I think that is acceptable
given where we are.
