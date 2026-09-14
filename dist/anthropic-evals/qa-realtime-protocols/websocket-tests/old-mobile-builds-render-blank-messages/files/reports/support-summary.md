# Blank message bodies - support summary, 2026-09-12

| app build | sessions sampled | blank bodies | rows rendered |
|-----------|------------------|--------------|---------------|
| 4.1.0     | 400              | 0            | correct       |
| 3.4.2     | 400              | 400          | correct       |
| 3.0.1     | 120              | 120          | correct       |
| 2.9.0     | 60               | 60           | correct       |

Row count and timestamps are right in every sample, only the body text is
missing. 2.9.0 predates subprotocol support in the mobile client entirely and
is affected the same way.
