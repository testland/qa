# Proposal — publish our own verifier package instead of changing what we send

@rkeeling, 2026-09-10. +1 @amorse, +1 @tstamatis

Changing what goes on the wire means re-onboarding eleven customers and a
breaking change for Brightsail, who have no engineering window until November.
Cheaper path:

1. Publish `@ourco/webhook-verify` — one function, `verify(secret, headers, body)`.
   It is `src/signer.js` turned inside out: same string, same key handling, about
   forty lines, zero dependencies.
2. Northwind, Kestrel and Marlow drop their library and use ours. Marlow's
   security reviewer gets a maintained, named package instead of hand-written
   code, which is the actual thing he objected to.
3. Add `test/contract.test.js`: sign an event with `buildRequest`, verify it with
   the published package, assert it passes. Sender and verifier can then never
   drift apart again, which is the real root cause here.

Nothing in `src/` changes, nothing Brightsail depends on moves, and we are done
this sprint.
