# Nightly export dead-letter queue, August

Rows the exporter refused and sent to the dead-letter queue rather than writing.
Nobody is paged on this queue; it is drained by hand when somebody remembers.

| Date       | Tenant | Rows | Reason recorded                    |
|------------|--------|-----:|------------------------------------|
| 2026-08-04 | 3a10   |  914 | not an ISO 4217 code: 'nok'        |
| 2026-08-11 | 3a10   |  951 | not an ISO 4217 code: 'nok'        |
| 2026-08-18 | c882   |  186 | not an ISO 4217 code: 'dkk'        |
| 2026-08-25 | 3a10   |  967 | not an ISO 4217 code: 'nok'        |

Tenant 3a10 has been on NOK since they signed. Neither tenant has ever appeared
in an export file. Nobody has complained, which is its own kind of worrying.
