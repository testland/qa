# Log and telemetry retention - platform

| Source | Retention |
|---|---|
| edge access logs | 14 days |
| application logs (api) | 30 days |
| cert-manager controller logs | 30 days |
| scheduler job run history | last 20 runs per job, no time bound |
| PagerDuty incident events | indefinite |
| vendor status archive | indefinite |
| vendor certificate upload audit | indefinite |
| change calendar (CHG-*) | indefinite |
| order and payment ledger | indefinite |

Note added 2026-09-12 by r.osei: I asked finance for the order ledger covering
2026-07-23 09:40-10:32 UTC. Requests go through their intake queue and the
stated turnaround is five working days.
