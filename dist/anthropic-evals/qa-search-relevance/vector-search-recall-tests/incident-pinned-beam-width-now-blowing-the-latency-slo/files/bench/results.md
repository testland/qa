# Beam sweep - 2026-09-09, Tom

`npm run sweep`, 180 vectors, 20 golden queries, k=10, exact reference computed
over the whole file.

| value | recall@10 | comparisons/query |
|-------|-----------|-------------------|
| 12    | 0.940     | 72.3              |
| 24    | 0.940     | 72.3              |
| 48    | 0.940     | 72.3              |
| 96    | 0.940     | 72.3              |
| 192   | 0.940     | 72.3              |
| 384   | 0.940     | 72.3              |

Thirty-two fold range, same recall, same cost, to the decimal. The parameter
does nothing for us. Proposal: take it to 12, hand the latency back to
platform and close INC-882 out.
