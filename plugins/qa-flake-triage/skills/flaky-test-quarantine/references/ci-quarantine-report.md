# Automating the expired-quarantine report in CI

Deep reference for `flaky-test-quarantine` SKILL.md. The Step 4
re-evaluation report script and its scheduled CI wiring, split out of the
main workflow so the mark / annotate / expiry / prune decisions stay in
front.

The annotation format from Step 2 is what makes this automatable: every
quarantine body carries a `Re-evaluate by YYYY-MM-DD` field, so a
scheduled job can grep the suite, extract the date, and list the entries
that have expired.

## The report script

A nightly (or weekly) job greps all quarantine annotations, extracts the
`Re-evaluate by` date, and lists expired entries. A minimal Bash version
against a Playwright suite:

```bash
#!/usr/bin/env bash
# scripts/list-expired-quarantines.sh
set -e
TODAY=$(date -u +%Y-%m-%d)

grep -rn -B1 -A5 "test\.fixme(" tests/ \
  | awk '/Re-evaluate by/ { print FILENAME ":" $0 }' \
  | while IFS= read -r line; do
      EXPIRY=$(echo "$line" | grep -oE 'Re-evaluate by [0-9]{4}-[0-9]{2}-[0-9]{2}' | awk '{print $3}')
      if [[ "$EXPIRY" < "$TODAY" ]]; then
        echo "EXPIRED: $line"
      fi
    done
```

Run it as a scheduled GitHub Action and post the output to a Slack
channel or open a tracking issue per expired entry.

## The scheduled workflow

```yaml
# .github/workflows/quarantine-report.yml
name: quarantine-report

on:
  schedule:
    - cron: '0 9 * * 1'   # Mondays 09:00 UTC
  workflow_dispatch:

jobs:
  list-expired:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: List expired quarantines
        run: bash scripts/list-expired-quarantines.sh > expired.txt

      - name: Open tracking issue per expired entry
        if: ${{ hashFiles('expired.txt') != '' }}
        run: |
          while IFS= read -r line; do
            gh issue create --title "Expired quarantine: ${line%%:*}" --body "$line"
          done < expired.txt
        env:
          GH_TOKEN: ${{ github.token }}
```

Each expired entry becomes a tracking issue that routes back to Step 5
pruning: fix and un-quarantine, renew once more (never past two
consecutive renewals), or delete the test.
