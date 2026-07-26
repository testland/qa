# TestRail per-result fields, CI wiring, and untested-case handling

Deep reference for the testrail-integration SKILL.md. Consult for the full
per-result field list, the end-to-end GitHub Actions workflow, and how to
surface tests that carry no TestRail case ID.

## Per-result fields

Fields accepted on each entry in the `add_results_for_cases` `results` array
(Step 4):

| Field        | Use                                                    |
|--------------|--------------------------------------------------------|
| `case_id`    | Required. The TestRail case ID.                        |
| `status_id`  | Required. Per the status-ID convention in Step 4.      |
| `comment`    | The test framework's failure message + stack trace.    |
| `elapsed`    | Format: `'1h 30m 45s'` or `'45s'`. Optional.           |
| `version`    | Build version / commit SHA. Searchable in the UI.      |
| `defects`    | Comma-separated Jira / GitHub issue keys.               |
| `assignedto_id` | Auto-assign failures to a specific user.            |

## Wire into a CI pipeline

```yaml
- name: Run tests
  run: npm test -- --reporters=jest-junit
  env:
    JEST_JUNIT_OUTPUT_FILE: junit.xml

- name: Sync to TestRail
  if: always()
  env:
    TESTRAIL_HOST: ${{ secrets.TESTRAIL_HOST }}
    TESTRAIL_USER: ${{ secrets.TESTRAIL_USER }}
    TESTRAIL_API_KEY: ${{ secrets.TESTRAIL_API_KEY }}
    TESTRAIL_PROJECT_ID: '42'
    TESTRAIL_SUITE_ID: '7'
    BUILD_VERSION: ${{ github.sha }}
  run: python scripts/testrail_sync.py junit.xml
```

The sync script:

1. Parses `junit.xml` (see `junit-xml-analysis`).
2. Extracts case IDs from test names (Step 2).
3. Opens a run named `<branch> · <sha-short>` (Step 3).
4. Batches results (Step 4).
5. Optionally closes the run (Step 5) - typically only on `main`.

## Handling untested case IDs

Tests that have no TestRail case ID (case removed; new test; intentional
sync-skip) need explicit handling:

```python
unmapped = [t for t in tests if extract_case_id(t['name']) is None]
if unmapped:
    print(f"Warning: {len(unmapped)} tests have no TestRail case ID:")
    for t in unmapped:
        print(f"  - {t['name']}")
```

Don't silently drop unmapped tests - they're candidates for either new
TestRail cases or naming-pattern fixes.
