# Bats output formats and CI integration

Output-format flags and continuous-integration wiring for `bats`, split out of
the main skill spine. See [SKILL.md](../SKILL.md) for the core workflow.

## Output formats

```bash
# Default (pretty)
bats test/

# TAP (CI-friendly, parseable)
bats --tap test/

# JUnit XML (for CI dashboards via TAP-to-JUnit converters)
bats --formatter junit test/ > junit.xml

# Verbose (show stdout/stderr of every command)
bats --verbose-run test/
```

## GitHub Actions

```yaml
jobs:
  bats:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { submodules: recursive }
      - run: |
          sudo apt-get install -y parallel
      - run: bats --jobs 4 --formatter junit test/ > junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: bats-junit, path: junit.xml }
```

`submodules: recursive` restores vendored `bats-core` / `bats-support` /
`bats-assert` when they are pinned as git submodules; GNU `parallel` is
required for `--jobs`.

## Docker

For Docker-based CI, per [bats][bats]: "Running Bats in Docker"
using the official `bats/bats:latest` image:

```yaml
- run: docker run --rm -v "$PWD:/code" bats/bats:latest test/
```

[bats]: https://bats-core.readthedocs.io/en/stable/
