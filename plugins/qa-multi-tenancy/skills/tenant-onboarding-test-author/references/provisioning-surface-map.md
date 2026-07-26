# Provisioning pipeline surface map

Walk the onboarding code path end-to-end and enumerate every surface that
changes state during provisioning or deprovisioning. Per the AWS Well-Architected
SaaS Lens
([docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html)),
isolation must be established at every layer of the stack independently:

| Surface | What to capture | How to find it |
|---|---|---|
| Tenant registry / catalog | Record created, unique key assigned | Central `tenants` table or tenant-management service |
| Identity store | User account created, role bindings | Auth provider admin API or IAM config |
| Database layer | Schema/row/database provisioned per isolation model | ORM migration runner, schema-per-tenant scripts |
| Object storage | Bucket or prefix created with scoped policy | IaC for storage resources |
| Quota / rate-limit table | Default quotas inserted for the new tenant | Quota service or DB seeding script |
| Billing record | Billing entry linked to tenant ID | Billing service or payment-provider webhook handler |
| Seed / default data | Feature flags, default roles, template data loaded | Seed scripts, fixture loaders |
| Re-provisioning path | Idempotent re-run: no duplicate records, no failed constraints | Provisioning entry point called twice |
| Offboarding / teardown | Data deletion, billing cancellation, quota cleanup | Delete or deactivate endpoint |

Per the Microsoft Multitenant Architecture Center
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle)),
onboarding must account for data residency, compliance tier, billing model, and
disaster-recovery SLOs, each of which can gate provisioning steps. Capture which
conditions gate each surface - a compliance-gated provisioning step needs its own
test branch.

Per the Microsoft resource organisation guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/resource-organization](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/resource-organization)),
quota and subscription limits must be modelled per tenant at provisioning time.
Record the expected default quota values - they are assertions, not
implementation details.
