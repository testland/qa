# One tenant saw another tenant's invoices under load

## Problem Description

Under load, a request for one tenant briefly returned another tenant's invoices, and a job exported every tenant's data (`docs/incident.md`), yet `tests/test_rls.py` passes. Fix `app/db.py` and `db/policies.sql`, and add tests that would have caught both.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: app/db.py ===============
import psycopg_pool

# DSN points at PgBouncer (pool_mode = transaction)
pool = psycopg_pool.ConnectionPool("postgresql://app@pgbouncer:6432/billing")

def tenant_connection(tenant_id: str):
    conn = pool.getconn()
    conn.execute(f"SET app.tenant_id = '{tenant_id}'")
    return conn

def release(conn):
    pool.putconn(conn)

=============== FILE: db/policies.sql ===============
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), tenant_id::text));

=============== FILE: tests/test_rls.py ===============
def test_tenant_sees_own_invoices(make_tenant):
    a, b = make_tenant(), make_tenant()
    conn = tenant_connection(a.id)
    rows = conn.execute("SELECT tenant_id FROM invoices").fetchall()
    assert all(r[0] == a.id for r in rows)

=============== FILE: docs/incident.md ===============
Under load, a request for tenant B briefly returned tenant A's invoices. A nightly job that
forgot to set a tenant exported every tenant's invoices. tests/test_rls.py passes.
