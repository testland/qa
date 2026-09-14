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
- In a ten-minute window the edge is holding 38 distinct stored variants of
  `/pricing`. Dumped and compared, the 38 differ from one another only in the
  `Accept-Language` value recorded against them; 37 of the 38 bodies are
  byte-identical.
- `/pricing` is 12% of all session starts. Peak is Monday 09:00-10:00.
