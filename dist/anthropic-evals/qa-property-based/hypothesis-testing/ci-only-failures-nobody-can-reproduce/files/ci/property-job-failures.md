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
