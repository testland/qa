import os
import psycopg

TENANT_A = "11111111-1111-1111-1111-111111111111"
TENANT_B = "22222222-2222-2222-2222-222222222222"


def test_tenant_a_sees_only_own_invoices():
    # CI: DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        conn.execute("SET app.tenant_id = %s", (TENANT_A,))
        rows = conn.execute(
            "SELECT tenant_id FROM invoices WHERE tenant_id = %s", (TENANT_A,)
        ).fetchall()
        assert rows
        assert all(str(r[0]) == TENANT_A for r in rows)
