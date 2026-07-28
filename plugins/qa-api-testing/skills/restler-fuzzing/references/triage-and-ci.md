# RESTler output tree and nightly CI workflow

Companion to the restler-fuzzing skill: the full results directory layout and
the complete nightly GitHub Actions workflow. Sourced from
[restler-readme](https://github.com/microsoft/restler-fuzzer).

## Output tree

```
RestlerResults/
  Compile/
    grammar.py
    dict.json
  Test/
    coverage_failures_to_investigate.txt
    bug_buckets/
  FuzzLean/
    bug_buckets/                   # one folder per unique bug pattern
      Bug_1/
        bug_replay_log.txt
        bug_request.txt
  Fuzz/
    bug_buckets/
    progress/
```

## Nightly CI workflow (GitHub Actions)

```yaml
# .github/workflows/restler-nightly.yml
name: restler-nightly

on:
  schedule:
    - cron: '0 2 * * *'   # nightly at 02:00 UTC
  workflow_dispatch:

jobs:
  fuzz-lean:
    runs-on: ubuntu-latest
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v5

      - name: Build RESTler image
        run: docker build -t restler ./.restler/

      - name: Compile grammar
        run: |
          docker run --rm -v "$PWD:/work" restler \
            compile --api_spec /work/openapi.json

      - name: Fuzz-lean
        env:
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: |
          docker run --rm -v "$PWD:/work" \
            -e API_TOKEN="$API_TOKEN" \
            restler fuzz-lean \
              --grammar_file /work/Compile/grammar.py \
              --dictionary_file /work/Compile/dict.json \
              --target_ip staging.example.com \
              --target_port 443 \
              --use_ssl

      - name: Upload bug buckets
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: restler-results
          path: |
            RestlerResults/
          retention-days: 30

      - name: Fail if bugs found
        run: |
          BUG_COUNT=$(find RestlerResults -name 'bug_replay_log.txt' | wc -l)
          if [ "$BUG_COUNT" -gt 0 ]; then
            echo "::error::RESTler found $BUG_COUNT bug(s) - see artifacts"
            exit 1
          fi
```
