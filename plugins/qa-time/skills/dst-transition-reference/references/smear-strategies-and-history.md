# Leap-smear strategies and the historical leap-second record

Deep reference for [leap-seconds.md](leap-seconds.md). Consult when
comparing how platforms absorb a leap second and when you need the
factual insertion history.

## Leap-smear

Per Google's "Time, technology and leaping seconds":
[googleblog.blogspot.com/2011/09/time-technology-and-leaping-seconds.html](https://googleblog.blogspot.com/2011/09/time-technology-and-leaping-seconds.html),
Google "smears" the leap second rather than stepping the clock. The
published standard is a "24-hour linear smear from noon to noon UTC"
([Google Public NTP: Leap Smear](https://developers.google.com/time/smear)),
adding a small fraction to each second so the total adds up to
1 second of slowdown, with no actual 23:59:60.

```
Leap second strategy comparison:

| Approach              | What happens                       |
|-----------------------|------------------------------------|
| IERS spec             | 23:59:60 UTC inserted (real second)|
| Linux kernel default  | Real insertion; time_t stalls 1s  |
| Google leap-smear     | Distributed over 24h               |
| AWS leap-smear        | Linear over 24h                    |
| NTP "step"            | Jump 1s; subsequent time_t differs |
```

The smear is operationally invisible to applications; the spec
exposes the discontinuity.

## Historical leap seconds

Per IERS, 27 leap seconds were inserted between 1972 and 2026.
Most recent: 2016-12-31 23:59:60 UTC. None have been added since:
IERS Bulletin C 72 (6 July 2026) states "from 2017 January 1, 0h
UTC, until further notice : UTC-TAI = -37 s" and that "NO leap
second will be introduced at the end of December 2026"
([datacenter.iers.org, Bulletin C](https://datacenter.iers.org/data/latestVersion/bulletinC.txt)).
None expected before 2035 abolition.
