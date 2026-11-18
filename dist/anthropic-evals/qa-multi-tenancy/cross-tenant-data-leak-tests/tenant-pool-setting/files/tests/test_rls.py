def test_tenant_sees_own_invoices(make_tenant):
    a, b = make_tenant(), make_tenant()
    conn = tenant_connection(a.id)
    rows = conn.execute("SELECT tenant_id FROM invoices").fetchall()
    assert all(r[0] == a.id for r in rows)
