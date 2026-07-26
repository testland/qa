# bundle-audit CI wiring and suppression waivers

Deep reference for `bundle-audit-ruby` SKILL.md. Consult when writing a
committed `.bundler-audit.yml` waiver, wiring the audit into Rake, or gating a
CI pipeline on the exit code. SKILL.md keeps the install + first scan and
points here for the rest.

[ba-readme]: https://github.com/rubysec/bundler-audit

## Suppression waivers with justification

Create `.bundler-audit.yml` at the project root ([ba-readme]). The `ignore`
array takes CVE, GHSA, or OSVDB identifiers and is committed to source
control, making every suppression auditable in git history.

Every ignore MUST carry an inline justification: the reachability finding, the
approver, and a re-review date. Reviewers treat undocumented ignores as
unapproved.

```yaml
---
# Suppressions last reviewed: 2026-06-04
# Re-review by: 2026-09-04
ignore:
  # CVE-2024-1234: vulnerable function not reachable; foo-gem used only in
  # test fixtures. Verified via grep + code review. Approved: alice@example.com
  - CVE-2024-1234
```

Per-run suppression (not persisted) is for temporary automated workarounds
only; prefer the committed file for anything durable:

```bash
bundle-audit check --ignore CVE-2024-1234 --ignore GHSA-xxxx-yyyy-zzzz
```

`--ignore` has no built-in expiry. Enforce a review cadence in process: every
quarter, audit `ignore:` entries and drop any whose re-review date has passed.

## Rake integration

Register the audit tasks in your `Rakefile` ([ba-readme]):

```ruby
require 'bundler/audit/task'
Bundler::Audit::Task.new
```

This adds `rake bundle:audit` (runs the check) and `rake bundle:audit:update`
(updates the advisory db). Chain the audit into the default task so it gates
the local test run:

```ruby
task default: %w[spec bundle:audit]
```

`bundle:audit` exits non-zero on findings, so it fails the `default` run.

## Exit codes and CI gating

Per [ba-readme], `bundle-audit check` exits `0` when no vulnerabilities or
insecure sources are found, and non-zero when at least one is found - the
signal CI keys on.

```yaml
jobs:
  bundle-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - name: Install bundler-audit
        run: gem install bundler-audit
      - name: Run audit
        run: bundle-audit check --update --format json --output bundle-audit.json
      - name: Upload findings
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bundle-audit
          path: bundle-audit.json
```

The `if: always()` upload keeps findings accessible even when the audit step
fails, enabling triage without re-running the workflow.
