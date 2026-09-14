# Experiment 4471 - pricing page, two arms

| Day        | Sessions | Arm A assigned | Arm B assigned | Arm A observed | Arm B observed |
|------------|----------|----------------|----------------|----------------|----------------|
| 2026-09-08 | 41,200   | 20,614         | 20,586         | 2.2%           | 97.8%          |
| 2026-09-09 | 39,850   | 19,901         | 19,949         | 2.6%           | 97.4%          |
| 2026-09-10 | 40,105   | 20,070         | 20,035         | 2.5%           | 97.5%          |
| 2026-09-11 | 38,990   | 19,502         | 19,488         | 2.6%           | 97.4%          |

Notes:

- "Assigned" is read from the session table. "Observed" is what the page
  actually rendered, from the front-end beacon.
- Edge TTL on `/pricing` is 600s throughout the window.
- The edge reports a 98.1% hit rate on `/pricing` and 0.9 origin requests a
  second averaged over the window.
- `/pricing` is 12% of all session starts. Peak is Monday 09:00-10:00.
- The platform change went out 2026-09-09 11:20. The rows either side of it are
  unchanged.

## Appliance variant dump, /pricing, 2026-09-11 14:05

Taken inside one ten-minute window. "Recorded" is the request-header value the
appliance stored against the variant when it was created.

| # | accept-language recorded | x-experiment-bucket recorded | body sha256 (first 8) |
|---|--------------------------|------------------------------|------------------------|
| 1 | en-GB                    | (none)                       | 4f1a9c02               |
| 2 | en-US                    | (none)                       | 4f1a9c02               |
| 3 | en-GB,en;q=0.9           | (none)                       | 4f1a9c02               |
| 4 | fr-FR                    | (none)                       | 4f1a9c02               |
| 5 | de-DE                    | (none)                       | 4f1a9c02               |
| … | 32 further rows, every one with the same two columns and the same hash    |
| 38| pt-BR                    | (none)                       | b7e35510               |

38 variants in the window. 37 carry hash `4f1a9c02`; variant 38 is the only one
that differs, and it was created 40 seconds after a deploy.
