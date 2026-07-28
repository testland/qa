# Semgrep CLI reference

Full flag, output-format, and exit-code detail for `semgrep-rules`. The
SKILL.md spine keeps the common commands; this file holds the exhaustive
tables. All entries per
[semgrep.dev/docs/cli-reference](https://semgrep.dev/docs/cli-reference).

## Output formats

| Flag | Purpose |
|---|---|
| `--json` | Semgrep JSON format (for multi-scanner triage) |
| `--sarif` | SARIF format (GitHub Code Scanning upload) |
| `--gitlab-sast` | GitLab SAST format (GitLab Security Dashboard) |
| `--junit-xml` | JUnit XML (test reporters) |
| `--text` | Default human-readable |
| `--output VAL` | Write to file or URL |

## Performance flags

```bash
semgrep scan -j 8 --timeout 10 --max-target-bytes 5000000
```

- `-j VALUE` - Parallelism degree (default: 3)
- `--timeout=DOUBLE` - Per-rule per-file timeout in seconds (default: 5.0)
- `--max-target-bytes=VALUE` - Skip files exceeding size (default: 1000000)

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success, no issues |
| 1 | Issues detected (with `--error` flag) |
| 2 | Fatal error |
| 3 | Invalid syntax in scanned language |
| 4 | Invalid pattern in rule |
| 5 | Invalid YAML configuration |
| 7 | Invalid rule in configuration |
| 8 | Unsupported language specified |
| 13 | Invalid API key |

The spine gates on 0 (pass) / 1 (findings) / 2 (fatal); the rest signal
config or rule authoring errors.
