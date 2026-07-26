# Burp Enterprise CI integration

Burp Enterprise (CI-friendly) workflow:

1. Enterprise server stores scan configurations + targets.
2. CI script triggers a scan via the Enterprise REST API.
3. CI script polls for completion + downloads issues as JSON.
4. CI script parses + gates per severity.

The full CI-driven scanning model is documented per [automated scanning][burp-as]
"CI-driven scanning"; consult portswigger.net/burp/documentation/enterprise
for current API endpoints (the surface is stable but per-version specifics
evolve).

## GitHub Actions workflow (Enterprise model)

```yaml
jobs:
  burp-enterprise:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Burp Enterprise scan
        run: |
          SCAN_ID=$(curl -s -X POST "${{ secrets.BURP_ENT_URL }}/api/scans" \
            -H "Authorization: ${{ secrets.BURP_ENT_TOKEN }}" \
            -d '{"site_id":42,"scan_configuration_id":7}' \
            | jq -r '.id')
          echo "SCAN_ID=$SCAN_ID" >> $GITHUB_ENV
      - name: Wait for scan completion
        run: |
          while true; do
            STATUS=$(curl -s "${{ secrets.BURP_ENT_URL }}/api/scans/$SCAN_ID" \
              -H "Authorization: ${{ secrets.BURP_ENT_TOKEN }}" | jq -r '.status')
            [ "$STATUS" = "succeeded" ] && break
            [ "$STATUS" = "failed" ] && exit 1
            sleep 30
          done
      - name: Download issues
        run: curl -s "${{ secrets.BURP_ENT_URL }}/api/scans/$SCAN_ID/issues" \
            -H "Authorization: ${{ secrets.BURP_ENT_TOKEN }}" -o burp-issues.json
```

[burp-as]: https://portswigger.net/burp/documentation/desktop/automated-scanning
