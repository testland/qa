---
component: python-test-author
type: agent
archetype: A2
---

# python-test-author — evals

Companion eval cases for [`python-test-author`](../../python-test-author.md).
Three cases covering happy path + branch + adversarial. Re-run by feeding
the **Input** block as the first user message to the agent and comparing
the emitted test file against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date —
each eval is designed to be re-run against each tier.

## Eval 1 — happy path — pyproject.toml + pytest → def test_… + plain assert is None

**Input:**

```
Author a Python unit test for this target callable.

Target module + function signature:
  user_service.py  →  get_user(repo: UserRepo, id: UUID) -> User | None
  (declared in src/user_service.py)
Behavior spec: "Given an empty in-memory repo, when get_user is called
                with any UUID, then it returns None."
Project root: . (contains pyproject.toml at the root, plus an empty tests/ dir)

pyproject.toml (excerpt):
[tool.pytest.ini_options]
minversion = "7.0"
testpaths = ["tests"]

[tool.poetry.dev-dependencies]
pytest = "^8.0"
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Detects pytest (from `[tool.pytest.ini_options]` in
`pyproject.toml`). Emits ONE test file at `tests/test_user_service.py`
with a top-level `def test_get_user_…():` function (no `unittest.TestCase`
subclass) and a plain `assert result is None` (not `self.assertIsNone`).
Imports the target via `from user_service import get_user`. Does NOT
introduce `unittest`, `doctest`, or `nose2` imports. Does NOT install or
add `mimesis` (not in deps) but may invent a tiny in-memory repo stub
locally.

**Pass condition:** Output filename ends in `test_user_service.py` under
`tests/`. Output contains both `def test_` AND `assert` AND one of
`is None` / `== None` / `result is None`. Output does NOT contain
`import unittest`, `unittest.TestCase`, `import doctest`, OR `import nose2`.

## Eval 2 — branch — no pyproject.toml + existing unittest tests → unittest.TestCase + assertIsNone

**Input:**

```
Author a Python unit test for this target callable.

Target module + function signature:
  user_service.py  →  get_user(repo: UserRepo, id: UUID) -> User | None
  (declared in src/user_service.py)
Behavior spec: "Given an empty in-memory repo, when get_user is called
                with any UUID, then it returns None."
Project root: . (no pyproject.toml; no setup.cfg pytest block)

Existing test file tests/test_auth_service.py (excerpt):
import unittest
from auth_service import authenticate

class TestAuthService(unittest.TestCase):
    def test_authenticate_rejects_empty_password(self):
        self.assertFalse(authenticate("alice", ""))

if __name__ == "__main__":
    unittest.main()
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Detects unittest (no pytest config; existing tests are
`unittest.TestCase` subclasses with `self.assert*` calls). Switches from
the pytest default to unittest. Emits `tests/test_user_service.py` with
`import unittest`, a `class TestUserService(unittest.TestCase):`, a
`def test_get_user_…(self):` method, and `self.assertIsNone(result)` (NOT
a plain `assert`, since the project's convention is TestCase-based). Does
NOT introduce pytest-only constructs (`@pytest.fixture`,
`@pytest.mark.parametrize`).

**Pass condition:** Output filename ends in `test_user_service.py` under
`tests/`. Output contains `import unittest` AND `unittest.TestCase` AND
one of `self.assertIsNone(result)` / `self.assertEqual(result, None)`.
Output does NOT contain `@pytest.fixture` OR `@pytest.mark.parametrize`
OR `import doctest` OR `import nose2`.

## Eval 3 — adversarial — spec asks for a universally-quantified property → refuse, defer to property-based

**Input:**

```
Author a Python unit test for this target callable.

Target module + function signature:
  pricing.py  →  apply_discount(price: Decimal, pct: int) -> Decimal
  (declared in src/pricing.py)
Behavior spec: "For ANY non-negative price and ANY pct in 0..100,
                apply_discount(price, pct) returns a value in
                [0, price]. Property must hold across the full input
                space, not just example values."
Project root: . (contains pyproject.toml with [tool.pytest.ini_options])
```

**Target models:** sonnet (2026-05-24)

**Expected:** Refuses to author. Detects the universally-quantified
phrasing ("ANY ... ANY ... full input space ... property must hold")
which is property-based-test scope, not example-based unit-test scope.
Recommends the user invoke the `qa-property-based` plugin's authoring
agent instead (when it lands). Does NOT silently downgrade the property
into a single example test (that would lose the original spec's intent —
a single example cannot prove a universal property).

**Pass condition:** Output does NOT contain a generated test method body
(no `def test_…` function that calls `apply_discount` with concrete
values, AND no `unittest.TestCase` subclass with a body that does the
same). Output contains at least one of the words
`refuse` / `property` / `property-based` / `hypothesis` AND mentions
`qa-property-based` OR `property-based-test-author` OR `property-based`
plugin/agent referral. Output explains why example-based testing cannot
prove a universal claim.

## Reproducibility notes

- Inputs are concrete file contents inlined above; no external fixtures.
- Pass conditions are string-match checks on the emitted test file
  content (or, for Eval 3, on the agent's refuse-to-proceed message).
- The agent's tool surface (`Write`, `Edit`, narrow
  `Bash(pytest *)` / `Bash(python -m unittest *)` /
  `Bash(python -m doctest *)` / `Bash(nose2 *)`) writes only into the
  project's `tests/` tree or alongside source per the detected layout;
  eval re-runs should not modify production source.
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7
  sub-checks (≥3 cases, ≥1 adversarial, concrete pass conditions).
