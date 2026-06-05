# Security policy

## Scope

`testland-qa` is a Claude Code plugin marketplace. The repo ships:

- The marketplace manifest (`.claude-plugin/marketplace.json`)
- 77 plugins under `plugins/`, each containing skills, agents, and
  documentation that wrap third-party tools
- Validation tooling under `scripts/`

**In scope** for this policy:

- Issues in `scripts/`, `.github/workflows/`, the marketplace manifest, or
  plugin manifests that could affect contributors or installers
- Plugin content that produces unsafe instructions when installed in Claude Code

**Out of scope** for this policy:

- Issues in the third-party tools that individual plugins wrap (e.g.,
  Semgrep, OWASP ZAP, Promptfoo, etc.). Report those upstream — each plugin's
  README links to the canonical project.

## How to report

Please **do not** open a public GitHub issue for sensitive reports.

Use GitHub's private vulnerability reporting: open the repository's
**Security** tab and click **Report a vulnerability**
(<https://github.com/testland/qa/security/advisories/new>). This keeps the
report private to the maintainers until a fix ships.

Include:

- A short summary of the issue
- Reproduction steps
- Affected file paths or plugin names
- Your suggested severity, if any

We will acknowledge receipt within 5 business days and aim to provide a fix
or mitigation timeline within 30 days, depending on complexity.

## Disclosure

We follow coordinated disclosure. Once a fix has shipped, we credit the
reporter (with permission) in the relevant `CHANGELOG.md` entry.
