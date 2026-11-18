Under load, a request for tenant B briefly returned tenant A's invoices. A nightly job that
forgot to set a tenant exported every tenant's invoices. tests/test_rls.py passes.
