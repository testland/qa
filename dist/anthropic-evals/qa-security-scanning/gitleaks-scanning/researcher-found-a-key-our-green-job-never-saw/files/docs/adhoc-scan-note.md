# Marek, #inc-4f1c9ab, 2026-09-11 16:40

Fresh clone of `hexley/edge-router`, nothing modified, same config file the CI
job uses. I left the snapshot flag off so I could see everything:

```
$ gitleaks git . --config .gitleaks.toml \
    --report-format json --report-path adhoc.json
...
51s  10 findings
```

Report attached as `.secrets/adhoc-full-scan-2026-09-11.json`. The researcher's
one is in there — it is the `4f1c9ab` record. I have not touched the workflow
file or the config.
