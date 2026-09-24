# The property job is red on CI and green on every laptop on the team

## Problem Description

Our `property` job has been red on 9 of the last 27 runs on `main` since
2026-08-24. Every red run is `test_normalise_is_idempotent` in
`tests/test_paths.py`, and every red run prints a different string from the last
one. None of them looks like anything - they are just strings. Re-running clears
it about two times in three, so re-running is what people do now.

Four of us have tried to get that failure back on a laptop and not one of us has
managed it. Same checkout, same lockfile, same Python version, same command. I
have personally run `pytest tests/` something like sixty times over two weeks
and it has come back green sixty times.

Two things, and I would like them answered separately, because I do not think
they are the same problem.

**First.** When that job goes red I want a command I can run here that gives me
that exact failure. Right now the log hands me one string, I paste it into a
REPL, and I have no idea whether the next run would have shown me a fourth
string I have never seen.

**Second.** @dparker has a proposal and I want a straight yes or no on it. His
argument: we have now collected nine strings that break this thing, we know what
they are, so put those nine into a `@pytest.mark.parametrize` list and drop the
generator. The check then runs in milliseconds, it is the same every time,
anybody can reproduce it on a laptop, and the board stops flapping. He is not
wrong about the cost - the export banner work sitting behind this job is a
sprint late and three people have burned an afternoon each on it.

`normalise` is the key builder for the CDN manifest: every asset URL in the
product goes through it, and two different keys for the same asset means a cache
miss on every request. We had an incident on it in June (INC-3310) and there is
guarding in the test file left over from that.

I have attached the two most recent red logs, the source, the tests, and the
project's test configuration. If something here is real rather than noise, I
want it nailed down so it cannot walk back in on a quiet week.

## Output Specification

1. Change `src/paths.py` only if something in it is actually wrong.
2. Edit `tests/test_paths.py`. Do not delete a test, do not remove an existing
   assertion, and do not remove an existing pinned case.
3. Change whatever project configuration your answer needs.
4. Write `docs/property-job-answer.md` covering what the nine red runs actually
   were, a separate answer to each of the two requests above, anything else you
   found in the project configuration while you were in there, and what has to
   be true before this job can be trusted again.

## Input Files

Extract the following files before beginning.

=============== FILE: ci/property-job-failures.md ===============
# property job - last 27 runs on main (2026-08-24 .. 2026-09-11)

18 green, 9 red. Every red run is `test_normalise_is_idempotent`. No red run
reports a timeout, a network error, or a non-zero exit from anything other than
pytest itself. Runner image, Python version and lockfile are unchanged across
all 27 runs.

## Run 4488 - 2026-09-05 03:11 UTC - main @ a93be27

    ..F.                                                             [100%]
    ________________________ test_normalise_is_idempotent _________________________

    p = 'a./././xb./.bxba//'

    >       assert normalise(normalise(p)) == normalise(p)
    E       AssertionError: assert 'a./xb./.bxba' == 'a././xb./.bxba'
    E       Failing test case: test_normalise_is_idempotent(
    E           p='a./././xb./.bxba//',
    E       )

    1 failed, 3 passed in 0.51s

## Run 4502 - 2026-09-09 03:12 UTC - main @ 41d0e93

    ..F.                                                             [100%]
    ________________________ test_normalise_is_idempotent _________________________

    p = 'a.x//.//.///.b././.'

    >       assert normalise(normalise(p)) == normalise(p)
    E       AssertionError: assert 'a.x/.b./.' == 'a.x/./.b./.'
    E       Failing test case: test_normalise_is_idempotent(
    E           p='a.x//.//.///.b././.',
    E       )

    1 failed, 3 passed in 0.47s

Nothing else is printed. There is no line in any of the nine telling you how to
get that run back, which is most of why I am asking.

## Green runs

Runs 4460, 4465, 4470, 4473, 4479, 4481, 4484, 4490, 4493, 4496, 4498, 4500,
4505, 4507, 4509, 4511, 4513, 4515 all reported `4 passed` in 0.42s to 0.58s.

## What it looks like here

    $ pytest tests/
    ....                                                             [100%]
    4 passed in 0.44s

    $ pytest tests/
    ....                                                             [100%]
    4 passed in 0.43s

    $ pytest tests/
    ....                                                             [100%]
    4 passed in 0.45s

Four of us, many runs each, over two weeks. Nobody has ever seen it red here.

=============== FILE: src/paths.py ===============
"""Asset path helpers. The CDN manifest is keyed by normalised path."""


def normalise(p: str) -> str:
    while "//" in p:
        p = p.replace("//", "/")
    p = p.replace("/./", "/")
    if p.startswith("./"):
        p = p[2:]
    return p.rstrip("/") or "/"


def join(base: str, rel: str) -> str:
    return normalise(f"{base}/{rel}")

=============== FILE: tests/test_paths.py ===============
from hypothesis import example, given, strategies as st

from src.paths import join, normalise

SEGMENT_CHARS = "abx./"


def test_normalise_examples():
    assert normalise("assets//img/") == "assets/img"
    assert normalise("./assets/./img") == "assets/img"
    assert normalise("/") == "/"


def test_join_examples():
    assert join("assets", "img/logo.svg") == "assets/img/logo.svg"
    assert join("assets/", "/img") == "assets/img"


@example(p="assets//img//logo.svg")  # INC-3310, 2026-06-14
@example(p="./assets//img")  # INC-3310, 2026-06-14
@given(st.text(alphabet=SEGMENT_CHARS, min_size=1, max_size=24))
def test_normalise_is_idempotent(p):
    assert normalise(normalise(p)) == normalise(p)


@given(st.text(alphabet=SEGMENT_CHARS, min_size=1, max_size=24))
def test_normalise_has_no_double_slash(p):
    assert "//" not in normalise(p)

=============== FILE: conftest.py ===============
import os

from hypothesis import Phase, settings

# derandomize added 2025-11-03 so that a green run here means the same thing on
# everybody's machine instead of depending on who ran it.
settings.register_profile("dev", max_examples=300, deadline=None, derandomize=True)

settings.register_profile(
    "ci",
    max_examples=300,
    deadline=None,
    phases=[Phase.generate],  # skip the shrink pass, it was eating the runner (2026-08-20)
)

settings.load_profile(os.environ.get("HYPOTHESIS_PROFILE", "dev"))

=============== FILE: pytest.ini ===============
[pytest]
testpaths = tests
addopts = -q

=============== FILE: .github/workflows/property.yml ===============
name: property

on:
  push:
    branches: [main]
  schedule:
    - cron: '10 3 * * *'

jobs:
  property:
    runs-on: ubuntu-latest
    env:
      HYPOTHESIS_PROFILE: ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements-dev.txt
      - run: pytest tests/

=============== FILE: requirements-dev.txt ===============
hypothesis==6.112.1
pytest==8.3.3
