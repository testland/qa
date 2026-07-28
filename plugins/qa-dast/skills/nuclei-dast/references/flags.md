# Nuclei flag reference

Full CLI flag reference for `nuclei-dast` Step 3. Source:
https://docs.projectdiscovery.io/tools/nuclei/running

| Flag | Default | Use |
|---|---|---|
| `-u <url>` | (required) | Single target URL or host |
| `-l <file>` | - | File of targets, one per line |
| `-t <path>` | community templates | Template file or directory |
| `-tags <tag,...>` | - | Run only templates with matching tags |
| `-severity <level,...>` | - | Filter by `info`, `low`, `medium`, `high`, `critical` |
| `-etags <tag,...>` | - | Exclude templates by tag |
| `-exclude-severity <level,...>` | - | Skip severity levels |
| `-rl <int>` | 150 | Max requests per second |
| `-c <int>` | 25 | Parallel templates to execute |
| `-bs <int>` | 25 | Hosts processed per template |
| `-timeout <int>` | 10 | Request timeout in seconds |
| `-retries <int>` | 1 | Retries on failure |
| `-j` / `-jsonl` | off | JSONL output (feeds triager) |
| `-o <file>` | stdout | Output file path |
| `-se <file>` | - | SARIF export (GitHub Code Scanning) |
| `-stats` | off | Show live scan statistics |
| `-validate` | off | Syntax-check templates without running |
| `-debug` | off | Print all requests and responses |

`-rl` caps request rate regardless of the `-c` and `-bs` concurrency settings:
the request rate cannot exceed the value set by `-rl`.
