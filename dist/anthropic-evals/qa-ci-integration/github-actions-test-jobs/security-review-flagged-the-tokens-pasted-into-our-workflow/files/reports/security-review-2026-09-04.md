# Security review - wavelet-cli - 04 Sep 2026

Repository: public, 31 forks, 604 stars. Default branch `main`.

| # | Finding                                                              | Severity |
|---|----------------------------------------------------------------------|----------|
| 1 | Live npm publish token committed in `.github/workflows/test.yml`      | Critical |
| 2 | Live Slack incoming-webhook URL committed in the same file            | High     |
| 3 | Workflow-level `env:` exposes every value to every job and every step | Low      |
| 4 | Pull-request metadata expanded inside a `run:` command string         | Medium   |

Reviewer note on findings 1 and 2: "Relocating the values is not remediation on
its own. Tell me what was done about the exposure, not only about the file. Our
checklist wants the answer to that question in writing before this closes."

Reviewer note on finding 4: "Flagged mechanically by the scanner. I have not
assessed it; include your own assessment in the reply."
