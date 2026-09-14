# The three comments as posted on 3b91c07 (comments 117, 118, 119 of 119)

---

**security-bot** commented:

## semgrep

164 findings. Top 10 by severity:

| Severity | Location | Rule |
|---|---|---|
| critical | src/auth/login.js:42 | js/sql-injection |
| high | web/render.js:30 | js/xss |
| medium | src/api/orders.js:12 | js/hardcoded-secret |
| medium | src/api/webhooks.js:210 | js/ssrf |
| ... | ... | ... |

Full report in the semgrep artifact.

---

**security-bot** commented:

## trivy

74 findings.

| Severity | Package | CVE |
|---|---|---|
| critical | npm:next@14.2.3 | CVE-2025-29927 |
| high | npm:vite@6.2.2 | CVE-2025-30208 |
| medium | npm:body-parser@1.20.2 | CVE-2024-45590 |
| ... | ... | ... |

---

**security-bot** commented:

## gitleaks

3 findings.

| File | Rule |
|---|---|
| config/settings.py:18 | aws-access-token |
| test/fixtures/sample.env:4 | generic-api-key |
| docs/examples/curl.md:12 | generic-api-key |
