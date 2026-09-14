# Kettle - FY27 H1 scope

In scope for the next two quarters:

1. **Saved queries** - a customer writes a query against their own workspace's
   event data and saves it. Query text is customer-authored and interpolated
   into the store's query language.
2. **Scheduled exports** - a saved query runs on a cron and the export worker
   delivers the result to the customer's destination (S3 bucket or webhook).
   The export worker calls the query API as a client.
3. **Workspace members and roles** - owner, editor, viewer. A member of one
   workspace must never read another workspace's data.
4. **API tokens** - customers mint scoped tokens for programmatic access.

Not in scope: the workspace redesign (deferred), the SSO/SAML integration
(FY27 H2), the on-premise deployment option (no customer has asked).

Contractual context: three of our eleven enterprise customers have a data
processing agreement that names tenant isolation explicitly. Two are in the EU.
