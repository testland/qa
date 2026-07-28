# Fixture mechanics - Playwright and pytest

Deep mechanics for Step 3 of `test-framework-blueprint`. The blueprint decisions
(which scope, what each fixture provides, whether tests mutate it) live in
`SKILL.md`; this file carries the framework-specific wiring.

## Playwright mechanics to standardize in the conventions doc

All per the [test-fixtures docs](https://playwright.dev/docs/test-fixtures):

- Custom fixtures via `test.extend()`; teardown code follows `await use(...)`
  in the same function, so setup and teardown live together.
- Cross-cutting fixtures that every test needs (e.g. a network-stub guard)
  are declared `{ auto: true }`: they are "set up for each test/worker, even
  when the test does not list them directly."
- Fixture modules from separate concerns combine via `mergeTests()`; this is
  what makes the `fixtures/index.ts` single-import convention work.
- Tunable values (base URL, default user role) become option fixtures
  (`{ option: true }`) configured through `test.use()` per project.

## The pytest equivalent

If Step 2 chose Python, the same architecture maps onto pytest fixtures. Per
the [pytest fixtures how-to](https://docs.pytest.org/en/stable/how-to/fixtures.html),
tests request fixtures by declaring them as arguments; available scopes are
`function` (the default), `class`, `module`, `package`, and `session`, where
scope controls destruction (a `function`-scoped fixture "is destroyed at the
end of the test"; a `session`-scoped one at the end of the test session).
The `fixtures/index.ts` merged-export convention becomes `conftest.py`
(fixtures there are accessible to "tests from multiple test modules in the
directory"), teardown code goes after `yield`, and `{ auto: true }` becomes
`@pytest.fixture(autouse=True)`. Playwright's worker scope has no direct
pytest twin; `session` scope plus per-worker IDs (e.g. `pytest-xdist` worker
id) fills the same database-per-worker role.
