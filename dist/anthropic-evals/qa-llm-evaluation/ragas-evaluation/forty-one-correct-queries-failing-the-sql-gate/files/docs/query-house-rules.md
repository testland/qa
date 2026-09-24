# House rules for generated queries

Agreed with the data team and our auditors, 2026-06-02.

1. **Every generated query is tenant-scoped.** A query that touches a table
   carrying `tenant_id` must constrain it. A query that returns cross-tenant
   rows is a data incident whether or not the numbers are right.
2. **Nothing reads the `analytics_pii` schema.** The masked views in
   `analytics` carry the same rows. The PII schema exists for two batch jobs
   and is not for interactive querying, by anyone or anything.
