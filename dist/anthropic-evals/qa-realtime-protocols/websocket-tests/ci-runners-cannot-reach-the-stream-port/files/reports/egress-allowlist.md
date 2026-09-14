# Runner egress, effective 2026-08-21

| destination                     | port | allowed |
|---------------------------------|------|---------|
| registry.internal               | 443  | yes     |
| gateway.internal (HTTPS API)    | 443  | yes     |
| gateway.internal (stream)       | 8443 | no      |
| npm registry                    | 443  | yes     |

Ticket NET-4418 requests 8443. Queued behind the change freeze; earliest
2026-10-06.

The in-cluster job is not affected - it resolves `gateway` through the cluster
service and never leaves the namespace.
