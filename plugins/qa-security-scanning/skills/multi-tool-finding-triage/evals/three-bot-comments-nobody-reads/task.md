# The security bot posts three comments per push and everyone has muted it

## Problem Description

Every push to a PR gets three comments from our security bot — one from each of
the tools that has a commenting step — and none of them replace the previous
one. PR #4471 ran 40 pushes and finished with 119 bot comments on it. Two
reviewers have filtered the bot into a folder they do not read, which means the
thing is now worse than nothing.

I want you to fix the output. Constraints from the team, which I have already
agreed to, so work inside them:

- **One comment per tool is fine and I would like to keep it.** semgrep belongs
  to the platform team, the dependency scanner belongs to infra, the secrets
  scanner belongs to security. Each team subscribes to its own thread and does
  not want the other teams' noise in it. Three focused threads beat one long one.
- **Cut the low and info findings completely.** PR #4471 finished with 47 low
  and 261 info. Nobody has fixed one of those in the eighteen months I have been
  here, and the comment has to fit on one screen or it goes straight back into
  the filtered folder.

Rhona, who reviews most of the checkout PRs, said this in the retro and it is
the thing I keep coming back to:

> In three years I have never once seen the same problem flagged by two of these
> tools. They each find their own stuff. So why are we paying for four scanners
> and reading four opinions?

Attached: the current workflow, the merged findings for the head commit of
#4471, the three comments as they were actually posted, and the pipeline notes.
Take the findings file as given — I am not asking you to re-run or re-merge
anything, I am asking for output a reviewer will act on.

## Output Specification

1. Write `docs/security-comment.md`: exactly what you want the bot to post on
   commit `3b91c07` of PR #4471, rendered, ready to paste.
2. Edit `.github/workflows/security-comment.yml` to post it that way, including
   what happens on the next push to the same PR.
3. If you are not doing something the team asked for, say so at the top of
   `docs/security-comment.md` in two or three sentences and give the reason.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/security-comment.yml ===============
name: security-comment

on:
  pull_request:

jobs:
  comment:
    needs: [scan]
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: scan-*
          merge-multiple: true
          path: ci-artifacts

      - name: render per-tool comments
        run: node ci/render-comments.js ci-artifacts

      - name: post semgrep comment
        run: gh pr comment "$PR" --body-file out/semgrep-comment.md
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}

      - name: post dependency comment
        run: gh pr comment "$PR" --body-file out/trivy-comment.md
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}

      - name: post secrets comment
        run: gh pr comment "$PR" --body-file out/gitleaks-comment.md
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}

=============== FILE: data/normalized-findings.json ===============
{
  "commit": "3b91c07",
  "pr": 4471,
  "gate": { "fail_on": "critical" },
  "scanners_run": [
    { "name": "semgrep", "version": "1.96.0", "findings": 164 },
    { "name": "sastpro", "version": "9.4.1", "findings": 171 },
    { "name": "trivy", "version": "0.58.1", "findings": 74 },
    { "name": "gitleaks", "version": "8.21.2", "findings": 3 },
    { "name": "checkov", "version": "3.2.334", "findings": 0 }
  ],
  "totals": {
    "raw": 412,
    "after_dedupe": 318,
    "consensus": 61,
    "low": 47,
    "info": 261
  },
  "note": "findings[] lists medium and above only; the low and info entries are in the triage-report.json artifact of this run",
  "findings": [
    {
      "severity": "critical",
      "file": "src/auth/login.js",
      "line": 42,
      "cwe": "CWE-89",
      "message": "SQL injection: request parameter concatenated into the login query",
      "fix_available": "parameterize the query",
      "caught_by": ["semgrep", "sastpro"]
    },
    {
      "severity": "critical",
      "package": "npm:next@14.2.3",
      "cve": "CVE-2025-29927",
      "message": "Middleware authorization bypass via a crafted internal header",
      "fix_available": "14.2.25",
      "caught_by": ["trivy"]
    },
    {
      "severity": "high",
      "file": "config/settings.py",
      "line": 18,
      "secret_class": "AWS Access Key",
      "verified": true,
      "message": "Live AWS access key committed to the repository",
      "fix_available": "rotate the key and move it to the secret store",
      "caught_by": ["gitleaks", "sastpro"]
    },
    {
      "severity": "medium",
      "severity_by_scanner": { "semgrep": "high", "sastpro": "medium" },
      "file": "web/render.js",
      "line": 30,
      "cwe": "CWE-79",
      "message": "Reflected cross-site scripting in template output",
      "fix_available": "escape the interpolated value",
      "caught_by": ["semgrep", "sastpro"]
    },
    {
      "severity": "high",
      "package": "npm:vite@6.2.2",
      "cve": "CVE-2025-30208",
      "message": "Arbitrary file read past server.fs.deny",
      "fix_available": "6.2.3",
      "caught_by": ["trivy"]
    },
    {
      "severity": "medium",
      "file": "src/api/orders.js",
      "line": 12,
      "cwe": "CWE-798",
      "message": "Hardcoded credential in source",
      "fix_available": "read it from the environment",
      "caught_by": ["semgrep"]
    },
    {
      "severity": "medium",
      "package": "npm:body-parser@1.20.2",
      "cve": "CVE-2024-45590",
      "message": "Denial of service when url encoding is enabled",
      "fix_available": "1.20.3",
      "caught_by": ["trivy", "sastpro"]
    },
    {
      "severity": "medium",
      "file": "infra/prod/main.tf",
      "line": 21,
      "message": "S3 bucket created without server-side encryption",
      "fix_available": "add server_side_encryption_configuration",
      "caught_by": ["trivy"]
    },
    {
      "severity": "medium",
      "file": "web/upload.js",
      "line": 77,
      "cwe": "CWE-22",
      "message": "Path traversal in the upload filename handler",
      "fix_available": "resolve and confine the path",
      "caught_by": ["sastpro"]
    },
    {
      "severity": "medium",
      "file": "src/api/webhooks.js",
      "line": 210,
      "cwe": "CWE-918",
      "message": "Server-side request forgery: outbound URL taken from the request body",
      "fix_available": "allow-list the destination hosts",
      "caught_by": ["semgrep"]
    }
  ]
}

=============== FILE: reports/pr-4471-comments.md ===============
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

=============== FILE: reports/pipeline-notes.md ===============
# Notes on the merge step, from the platform team

- Five tools produce output. `sastpro` and `checkov` have no commenting step of
  their own, which is why only three comments get posted. sastpro's 171
  findings reach the merged file but have never appeared in a PR comment.
- checkov returned zero findings on this commit. It ran; the terraform in
  `infra/` is scanned on every push.
- The merge writes `caught_by` correctly but the renderer drops the column to
  save width.
- When two tools disagree on severity for one merged record, the merge keeps
  whichever tool was written last, which is alphabetical by scanner id. We know
  this is arbitrary. `web/render.js:30` is the example everyone quotes: semgrep
  calls it high, sastpro calls it medium, the merged record says medium.
- `gh pr comment` is called three times per push with no de-duplication, which
  is where the 119 comments came from.
