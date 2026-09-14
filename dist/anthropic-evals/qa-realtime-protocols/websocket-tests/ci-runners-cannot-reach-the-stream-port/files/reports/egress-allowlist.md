# Runner egress, effective 2026-08-21

| destination                     | port | allowed |
|---------------------------------|------|---------|
| registry.internal               | 443  | yes     |
| gateway.internal                | 443  | yes     |
| gateway.internal                | 8443 | no      |
| npm registry                    | 443  | yes     |

Ticket NET-4418 requests 8443. Queued behind the change freeze; earliest
2026-10-06. In-cluster pods resolve `gateway` through the cluster service and
their traffic does not pass the proxy.
