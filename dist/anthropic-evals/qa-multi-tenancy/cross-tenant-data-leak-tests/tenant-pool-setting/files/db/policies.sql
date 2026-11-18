ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), tenant_id::text));
