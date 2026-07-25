# Schemathesis CI wiring and advanced pytest hooks

Deep reference for `schemathesis-fuzzing` SKILL.md. Consult when wiring
Schemathesis into CI, or when the pytest integration needs project-specific
auth / header injection.

## Advanced pytest integration - hooks

For finer-grained integration than the basic `@schema.parametrize()` shown
in SKILL.md ([schemathesis-readme][readme]):

[readme]: https://github.com/schemathesis/schemathesis

```python
@schema.parametrize()
@schemathesis.hook("before_call")
def add_auth(context, case):
    case.headers["Authorization"] = f"Bearer {os.environ['API_TOKEN']}"

def test_api_with_auth(case):
    case.call_and_validate()
```

Hooks let the team inject project-specific auth, header signatures,
or response post-processing without forking Schemathesis.

## CI integration

```yaml
# .github/workflows/api-fuzz.yml
name: api-fuzz

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'   # nightly broader run

jobs:
  schemathesis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - run: pip install schemathesis

      - name: Schemathesis run
        env:
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: |
          schemathesis run https://staging.example.com/openapi.json \
            --base-url https://staging.example.com \
            --hypothesis-max-examples 50 \
            --workers 4 \
            --header "Authorization: Bearer $API_TOKEN" \
            --junit-xml=results.xml

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: schemathesis-results
          path: results.xml
          retention-days: 14

      - name: Surface JUnit
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: API fuzz
          path: results.xml
          reporter: java-junit
```

The PR-trigger run uses lower `--hypothesis-max-examples` (e.g. 50)
for fast feedback; the nightly cron run uses higher values (200+)
for deeper coverage. This separation keeps PR CI under 10 minutes
without sacrificing nightly depth.

## Two complementary CI cadences

| Cadence  | Examples per endpoint | Purpose                                  |
|----------|-----------------------|------------------------------------------|
| Per-PR   | 50                    | Fast smoke; catch obvious schema-drift breaks. |
| Nightly  | 200-500               | Deep coverage; surface rarely-triggered edge cases. |
| Weekly   | 1000+                 | Pre-release deep validation.              |

Hypothesis (the underlying property-based engine) **shrinks** failures
to minimal reproducers automatically - a 200-example PR run is
plenty to surface most regressions; nightly depth catches the rare
ones.
