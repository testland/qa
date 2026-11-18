- Since we added our own `.gitleaks.toml`, a PR that committed an AWS access key and a Slack
  webhook URL passed the scan.
- The documented sample token in docs/api.md is flagged on every run.
- A real acme_live_ token in tests/fixtures/payments.json was missed last month.
