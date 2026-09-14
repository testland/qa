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

1. @tkowalski — Set the thread count to 5000 and run the whole thing on perf-01.
   It is eight times the machine the nightly runs on and the nightly is 800
   threads, so the arithmetic works and we never have to learn the multi-machine
   path at all.

2. @tkowalski — If we do end up going multi-machine, the runner script needs
   nothing doing to it. The July work already takes the generator list and passes
   the run settings through as overrides, and there is a test that proves it. An
   override is an override.

3. @rsantos — Keep perf-01 out of it. It is @tkowalski's interactive box and the
   four VMs are what ops actually lent us. Have gen-a drive the run and carry its
   share of the load as well: four machines, four shares, nothing sitting idle.

4. @tkowalski — The rehearsal points at the rehearsal stack, not staging. On the
   morning of the 19th I will open `plans/order-entry.jmx`, change the host to
   `rehearsal.orders.example.com`, and change it back on the 20th. It is one line
   and it is one afternoon.

5. @rsantos — The order-ID file. `data/order-ids.csv` lives in the repo and the
   plan reads it from a relative path. I want a copy of it dropped onto each of
   gen-a..gen-d before the window. @tkowalski says that is duplication for no
   reason and the repo is the single source of truth. I do not want to be the
   reason the run falls over so I am asking rather than arguing.

## Open

- Nobody has used gen-a..gen-d for anything yet.
- The nightly stays exactly where it is. Nobody wants it touched.
