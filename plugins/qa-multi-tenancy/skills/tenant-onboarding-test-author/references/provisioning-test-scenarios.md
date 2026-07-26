# Provisioning test scenarios per surface

For each surface from the surface map, identify the scenarios that must hold.

## Account creation

- Tenant record persists with a non-null unique identifier after a successful
  provisioning call.
- Provisioning a second tenant with the same email or slug returns an error (no
  silent duplication).
- A provisioning call that fails mid-flow leaves no partial record (atomicity).

## Isolation at creation (no cross-tenant bleed)

Per the Microsoft tenancy models guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models)),
isolation must hold from the first request a tenant makes, not only after
steady-state data accumulates. Test cases:

- Immediately after Tenant B is provisioned, a call authenticated as Tenant A
  cannot enumerate Tenant B's resources (list endpoint returns 0 items for A).
- Tenant B's provisioned schema or row-level security policy is in place before
  the first application-level write is accepted.
- No existing tenant's data becomes visible to the new tenant through shared
  infrastructure (cache warm-up, search index bootstrap, etc.).

## Default resource quotas

Per the Microsoft consumption measurement guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/measure-consumption](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/measure-consumption)),
per-tenant consumption limits should be tracked from provisioning. Test cases:

- A new tenant's quota record exists immediately after provisioning and matches
  the expected default values for the tenant's pricing tier.
- Attempting an action that exceeds the default quota (e.g., creating one more
  resource than the limit allows) returns a quota-exceeded error, not a generic
  error or a silent failure.
- Upgrading a tenant's tier updates the quota record (verify the seeded default
  and the upgrade delta separately).

## Billing record linkage

Per the Microsoft tenant lifecycle guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle)),
billing linkage is a first-class onboarding concern. Test cases:

- A billing record (subscription, customer ID, or metering entry) exists and
  references the tenant's canonical identifier within the same provisioning
  transaction.
- A provisioning call with an invalid payment method does not create a
  half-provisioned tenant.
- The billing record's tier matches the plan chosen at signup.

## Seed and default data

- Feature flags for the tenant's tier are present with correct default values.
- Default roles (e.g., `owner`, `member`, `viewer`) exist and are assigned to the
  provisioning user.
- Template or onboarding data (welcome project, sample records) is scoped
  exclusively to the new tenant - it does not appear in any other tenant's list
  endpoints.

## Idempotent re-provisioning

An idempotent provisioning call is one that produces the same final state
regardless of how many times it is invoked. Test cases:

- Calling the provisioning endpoint a second time with the same input returns a
  success response (or an explicit "already exists" response) without creating
  duplicate records.
- All constraint-unique fields (quota row, billing record, identity binding)
  remain singular after two provisioning calls.
- A re-provisioning call after a partial failure completes successfully without
  manual cleanup.

## Teardown and offboarding

Per the Microsoft tenant lifecycle guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle)),
offboarding must define a retention period and support re-onboarding during that
window. Test cases:

- After offboarding, the tenant's application data (records, files, jobs) is not
  accessible through any API endpoint.
- After offboarding, no row for the tenant exists in quota, billing, or identity
  tables (or rows are flagged deleted and excluded from active queries).
- Re-onboarding the same tenant during the retention period succeeds without data
  loss if re-onboarding is a supported operation.
- After the retention period expires (simulate with a fixed past timestamp), a
  hard-delete job removes all remaining rows; assert count = 0 across all
  tenant-bearing tables.
