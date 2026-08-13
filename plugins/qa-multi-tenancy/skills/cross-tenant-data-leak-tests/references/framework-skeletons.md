# Tenant-leak test skeletons

## pytest - full horizontal-escalation battery

```python
import pytest

class TestDocumentsTenantIsolation:
    """Per OWASP WSTG-ATHZ-02 - horizontal escalation battery."""

    def test_tenant_a_cannot_read_tenant_b_document(
        self, client, tenant_a_user, tenant_b_resource
    ):
        # Authenticate as tenant A user
        client.force_login(tenant_a_user)
        # Attempt to access tenant B's resource by ID
        response = client.get(f"/api/documents/{tenant_b_resource.id}/")
        assert response.status_code == 404, "Must return 404, not 403, to avoid existence disclosure"

    def test_tenant_a_cannot_list_tenant_b_documents(
        self, client, tenant_a_user, tenant_b_resource
    ):
        client.force_login(tenant_a_user)
        response = client.get("/api/documents/")
        assert response.status_code == 200
        ids = {d["id"] for d in response.json()["results"]}
        assert tenant_b_resource.id not in ids

    def test_tenant_id_in_body_is_ignored(
        self, client, tenant_a_user, tenant_b
    ):
        client.force_login(tenant_a_user)
        # Attempt to create a document for tenant B by spoofing the body
        response = client.post(
            "/api/documents/",
            data={"tenant_id": str(tenant_b.id), "body": "leak"}
        )
        # Must be rejected (400) or silently scoped to A (201 with A's tenant_id)
        if response.status_code == 201:
            doc = response.json()
            assert doc["tenant_id"] != str(tenant_b.id)

    def test_jwt_signed_for_a_rejected_on_b_endpoint(
        self, client, tenant_a_user, tenant_b_resource
    ):
        # Sign a JWT for tenant A user, use it on a B-scoped endpoint
        token = sign_jwt_for(tenant_a_user)
        response = client.get(
            f"/api/documents/{tenant_b_resource.id}/",
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )
        assert response.status_code in (401, 404)
```

## Postgres RLS-direct (language-agnostic)

For surfaces relying on RLS per `rls-reference`,
also test at the DB layer:

```sql
-- Connect as app_user (not superuser, not table owner)
BEGIN;
SET LOCAL app.tenant_id = '<tenant_a_uuid>';
-- Insert a row for tenant A
INSERT INTO documents (tenant_id, body) VALUES (current_setting('app.tenant_id')::uuid, 'a-doc');

-- Switch to tenant B
SET LOCAL app.tenant_id = '<tenant_b_uuid>';
SELECT count(*) FROM documents;  -- expect 0 (tenant A's row invisible)

-- Cross-tenant INSERT attempt
INSERT INTO documents (tenant_id, body) VALUES ('<tenant_a_uuid>', 'leak');
-- Expect: ERROR: new row violates row-level security policy for table "documents"
ROLLBACK;
```
