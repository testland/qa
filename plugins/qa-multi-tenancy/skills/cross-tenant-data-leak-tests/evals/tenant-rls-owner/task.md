# The RLS test passed while one tenant could read another's rows

## Problem Description

Find out why the RLS test did not catch the leak in `notes.md`, then fix the policy setup and the tests.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: db/roles.sql ===============
CREATE ROLE app LOGIN PASSWORD 'app';      -- the API connects as app; app also runs migrations
ALTER TABLE invoices OWNER TO app;

=============== FILE: db/migrations/007_rls.sql ===============
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

=============== FILE: tests/test_rls.py ===============
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

=============== FILE: notes.md ===============
A pen test pulled tenant B's invoices through the CSV export, which runs
`SELECT * FROM invoices` on the API's connection (role `app`) after setting app.tenant_id.
The RLS test in CI is green.
