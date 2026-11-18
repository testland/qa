A pen test pulled tenant B's invoices through the CSV export, which runs
`SELECT * FROM invoices` on the API's connection (role `app`) after setting app.tenant_id.
The RLS test in CI is green.
