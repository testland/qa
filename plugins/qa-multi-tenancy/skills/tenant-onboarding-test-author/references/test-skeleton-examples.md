# Provisioning test suite skeleton examples

Concrete skeletons for the emitted suite. Pick the framework from the selection
table in SKILL.md; the pytest example below maps one-to-one to the scenarios in
[provisioning-test-scenarios.md](provisioning-test-scenarios.md).

## Example skeleton (pytest)

```python
import pytest

class TestTenantProvisioning:
    """Provisioning lifecycle tests - distinct from runtime isolation battery."""

    def test_account_creation_stores_tenant_record(
        self, provisioning_client, pricing_tier
    ):
        response = provisioning_client.post(
            "/api/tenants/",
            data={"slug": "acme", "plan": pricing_tier.id, "owner_email": "owner@acme.com"}
        )
        assert response.status_code == 201
        assert response.json()["id"] is not None

    def test_isolation_new_tenant_invisible_to_existing_tenant_immediately(
        self, client, existing_tenant_user, new_tenant
    ):
        # New tenant was just provisioned; existing tenant must not see it
        client.force_login(existing_tenant_user)
        response = client.get("/api/workspaces/")
        ids = {w["id"] for w in response.json()["results"]}
        assert new_tenant.id not in ids

    def test_quota_default_matches_tier_on_creation(
        self, new_tenant, pricing_tier
    ):
        from quotas.models import TenantQuota
        quota = TenantQuota.objects.get(tenant=new_tenant)
        assert quota.max_users == pricing_tier.default_max_users
        assert quota.max_storage_gb == pricing_tier.default_max_storage_gb

    def test_billing_record_linked_on_creation(
        self, new_tenant, billing_stub
    ):
        assert billing_stub.was_called_for(new_tenant.id), (
            "Billing provider must be notified during provisioning"
        )
        record = billing_stub.get_record(new_tenant.id)
        assert record["plan"] == new_tenant.plan

    def test_seed_data_scoped_to_new_tenant_only(
        self, client, existing_tenant_user, new_tenant
    ):
        # Existing tenant must not see new tenant's seed data in shared endpoints
        client.force_login(existing_tenant_user)
        response = client.get("/api/projects/")
        tenant_ids = {p["tenant_id"] for p in response.json()["results"]}
        assert str(new_tenant.id) not in tenant_ids

    def test_provisioning_idempotent_no_duplicate_quota_row(
        self, provisioning_client, new_tenant, pricing_tier
    ):
        # Call provisioning a second time with the same input
        provisioning_client.post(
            "/api/tenants/",
            data={"slug": new_tenant.slug, "plan": pricing_tier.id,
                  "owner_email": "owner@acme.com"}
        )
        from quotas.models import TenantQuota
        count = TenantQuota.objects.filter(tenant=new_tenant).count()
        assert count == 1, "Idempotent re-provisioning must not create duplicate quota rows"

    def test_offboarding_deletes_application_data(
        self, admin_client, offboarded_tenant
    ):
        admin_client.delete(f"/api/tenants/{offboarded_tenant.id}/")
        response = admin_client.get(f"/api/tenants/{offboarded_tenant.id}/projects/")
        assert response.status_code == 404
```

## Example: idempotency via SQL assertion (language-agnostic)

```sql
-- After two provisioning calls for the same tenant slug:
SELECT count(*) FROM tenant_quotas WHERE tenant_id = '<new_tenant_uuid>';
-- Expected: 1 (not 2)

SELECT count(*) FROM billing_subscriptions WHERE tenant_id = '<new_tenant_uuid>';
-- Expected: 1 (not 2)
```
