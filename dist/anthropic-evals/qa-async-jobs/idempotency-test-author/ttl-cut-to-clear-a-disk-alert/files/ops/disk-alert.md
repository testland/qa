# Alert: redis-payments-dedup disk usage

Fires at 80% of 8GB. Fired four nights running, 01:50-02:20, clearing itself each
morning as the previous day's keys expire.

Current steady state: ~2.9M live keys, mean value size 1.8KB. The value stores
the full request body, including the raw card-network response blob added in May.
Key count tracks daily transaction volume and has grown 40% since March.
