Three leaks reached main without a finding:
1. k8s/payments-secret.yaml: a Kubernetes Secret with the Stripe live key in `data:` (base64).
2. test/fixtures/legacy-config.zip: an old .env with a database password, zipped for a migration test.
3. services/billing/client.go: an `acme_live_...` service token. The custom rule was added for exactly this.
The CI log also shows: "error parsing regexp: invalid or unsupported Perl syntax: `(?=`".
