# Pre-deploy evaluation

Before any deploy, run:

    node evals/runner.mjs

and paste the last line into the pull request description. It takes about a
second.

The suite is 240 cases. Anything other than 240 / 240 blocks the deploy.

We do not run this in CI. The API key is not available to the CI runners and
wiring one in has been on the backlog since March. If you need a key for
something else, ask Dan.

Unit tests for the runner itself:

    node --test evals/runner.test.mjs

Those five have passed since the day they were written.
