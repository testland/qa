# Xray CI wiring and the non-JVM Playwright path

Deep reference for the xray-integration SKILL.md. Consult for the end-to-end
GitHub Actions workflow (JWT fetch + import) and the official Playwright
reporter that lets non-JVM teams emit Xray-compatible JUnit XML.

## End-to-end CI shape

```yaml
# .github/workflows/xray-sync.yml
- name: Run tests with Xray-aware JUnit reporter
  run: ./mvnw -B verify
  # Produces target/xray-reports/TEST-results.xml

- name: Get Xray JWT
  id: xray_auth
  env:
    XRAY_CLIENT_ID: ${{ secrets.XRAY_CLIENT_ID }}
    XRAY_CLIENT_SECRET: ${{ secrets.XRAY_CLIENT_SECRET }}
  run: |
    JWT=$(curl -s -X POST 'https://xray.cloud.getxray.app/api/v2/authenticate' \
      -H 'Content-Type: application/json' \
      -d '{"client_id":"'"$XRAY_CLIENT_ID"'","client_secret":"'"$XRAY_CLIENT_SECRET"'"}' \
      | tr -d '"')
    echo "::add-mask::$JWT"
    echo "jwt=$JWT" >> "$GITHUB_OUTPUT"

- name: Import to Xray
  if: always()
  run: |
    curl -X POST 'https://xray.cloud.getxray.app/api/v2/import/execution/junit?projectKey=CALC' \
      -H "Authorization: Bearer ${{ steps.xray_auth.outputs.jwt }}" \
      -H 'Content-Type: application/xml' \
      --data-binary @target/xray-reports/TEST-results.xml
```

The `projectKey` requirement is covered in SKILL Step 6, JWT masking and
the 24h refresh in Step 1; both apply unchanged to the YAML above.

## Non-JVM teams: Playwright reporter

Per the Xray-App GitHub org, the [`playwright-junit-reporter`][pwj] project
ships a Playwright reporter that emits Xray-compatible JUnit XML. JavaScript
teams use:

[pwj]: https://github.com/Xray-App/playwright-junit-reporter

```typescript
// playwright.config.ts
reporter: [
  ['list'],
  ['@xray-app/playwright-junit-reporter', {
    outputFile: 'target/xray-reports/results.xml',
  }],
],
```

Then the same import endpoint (End-to-end CI shape, above) consumes the output.
