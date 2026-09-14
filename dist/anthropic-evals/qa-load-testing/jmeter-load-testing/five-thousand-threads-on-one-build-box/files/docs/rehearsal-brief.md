# Peak rehearsal — proposals

Owner: @tkowalski (perf)
Window: 2026-11-19, 14:00-16:00 UTC, against the rehearsal stack — a clone of
staging that is ours for the afternoon, `rehearsal.orders.example.com`.

## Target

5,000 concurrent order-entry sessions, 30-minute steady state after a 5-minute
ramp. Nightly today is 800 threads, 30-minute steady state, single runner, never
had a problem.

## Hardware

| Machine      | vCPU | RAM   | Notes                                        |
|--------------|------|-------|----------------------------------------------|
| perf-01      | 64   | 256GB | my box, where I do interactive work          |
| gen-a..gen-d | 16   | 32GB  | four identical VMs, same subnet, Java 21     |

## Proposals

1. Set the thread count to 5000 and run the whole thing on perf-01. It is eight
   times the machine the nightly runs on and the nightly is 800 threads, so the
   arithmetic works and we never have to learn the multi-machine path at all.

2. On the 18th I open `plans/order-entry.jmx` on perf-01 in the desktop
   application, add a response assertion on `POST /v2/orders` so that a 500 stops
   being counted as a good sample, save the file and commit it. Reviewing the XML
   in a pull request is miserable but the diff will be small, and building the
   element by hand in a text editor is not something I am prepared to do.

3. On the day I start the rehearsal from that same desktop session. Plan open on
   perf-01, the four generators listed, remote start across all of them.
   @mbennett gets the summary table and the response-time graph filling in live on
   the projector, which is exactly what he has asked for, and if the app tier
   starts folding one of us hits stop and it stops. The July work in
   `scripts/build-args.mjs` already leaves the nightly's first flag off the
   multi-machine path, which I take to mean whoever wrote it had the same idea.

4. Beyond that the runner script needs nothing doing to it. July's work takes the
   generator list and passes the run settings through as overrides, and there is a
   test that proves it. An override is an override.

5. @rsantos — the order-ID file. `data/order-ids.csv` lives in the repo and the
   plan reads it from a relative path. I want a copy of it dropped onto each of
   gen-a..gen-d before the window. @tkowalski says that is duplication for no
   reason and the repo is the single source of truth. I do not want to be the
   reason the run falls over so I am asking rather than arguing.

## Open

- Nobody has used gen-a..gen-d for anything yet.
- The nightly stays exactly where it is. Nobody wants it touched.
