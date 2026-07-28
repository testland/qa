# Tenant-leak attack patterns

## OWASP WSTG-ATHZ-02 scenarios

Three primary authorization-bypass scenarios apply to every pool/bridge
surface:

| Pattern | What | Surface |
|---|---|---|
| Horizontal escalation | Tenant A accesses tenant B's data at identical privilege | All pool/bridge surfaces |
| Vertical escalation | Non-admin in tenant A accesses admin-only resources | All admin-scoped surfaces |
| IDOR / BOLA | Direct reference attack - change an ID in URL/payload | All ID-bearing endpoints |

## Tenant-isolation-specific patterns

| Pattern | Test |
|---|---|
| **tenant_id from request payload** | Send tenant A's session with `tenant_id=B` in body - must reject |
| **Missing tenant_id filter in new endpoint** | Enumerate routes added in last N commits; verify each filters by tenant |
| **Cross-tenant via foreign key** | Create FK from tenant-A row to tenant-B row - must fail |
| **Cross-tenant via unique constraint** | Insert tenant-A row with a key that exists in tenant B - observe error timing as a side channel |
| **JWT replay across tenants** | Tenant A's JWT used to call tenant B's endpoint - must reject on signature/iss/aud check |
| **Object storage path traversal** | Tenant A presigned URL -> modify prefix to tenant B's - must 403 |
| **Search query without tenant filter** | Direct search index query - must include the tenant routing key |
| **Async job tenant context** | Job enqueued by tenant A -> executor must reload tenant context, not trust the message |
| **Cache key collision** | Tenant A and tenant B have the same logical key - cache must namespace |
| **Log scrubbing** | Tenant A errors must not leak tenant B identifiers |

Source: OWASP WSTG-ATHZ-02 Testing for Bypassing Authorization Schema
[owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema).
