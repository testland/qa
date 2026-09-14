# property job - last 27 runs on main (2026-08-24 .. 2026-09-11)

18 green, 9 red. Every red run is `test_normalise_is_idempotent`. No red run
reports a timeout, a network error, or a non-zero exit from anything other than
pytest itself. Runner image, Python version and lockfile are unchanged across
all 27 runs.

## Run 4488 - 2026-09-05 03:11 UTC - main @ a93be27

    tests/test_paths.py::test_normalise_is_idempotent

    Falsifying example: test_normalise_is_idempotent(
        p='a/././x',
    )

    >       assert normalise(normalise(p)) == normalise(p)
    E       AssertionError: assert 'a/x' == 'a/./x'

    1 failed, 3 passed in 6.42s

## Run 4502 - 2026-09-09 03:12 UTC - main @ 41d0e93

    tests/test_paths.py::test_normalise_is_idempotent

    Falsifying example: test_normalise_is_idempotent(
        p='/././ab',
    )

    >       assert normalise(normalise(p)) == normalise(p)
    E       AssertionError: assert '/ab' == '/./ab'

    1 failed, 3 passed in 6.08s

## Green runs

Runs 4460, 4465, 4470, 4473, 4479, 4481, 4484, 4490, 4493, 4496, 4498, 4500,
4505, 4507, 4509, 4511, 4513, 4515 all reported `4 passed` in 5.9s to 6.6s.

## What it looks like here

    $ pytest tests/
    ....                                                             [100%]
    4 passed in 0.19s

    $ pytest tests/
    ....                                                             [100%]
    4 passed in 0.18s

Four of us, several runs each, over two weeks.
