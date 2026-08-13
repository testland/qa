# buf CI integration

Gate `buf build`, `buf lint`, and `buf breaking` on every PR that touches
`.proto`, `buf.yaml`, or `buf.gen.yaml`. All three must pass before merge.

## GitHub Actions workflow

```yaml
# .github/workflows/proto-gate.yml
name: proto-gate
on:
  pull_request:
    paths:
      - "**/*.proto"
      - "buf.yaml"
      - "buf.gen.yaml"

jobs:
  buf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0   # Required for `--against ".git#branch=main"`
      - uses: bufbuild/buf-setup-action@v1
        with:
          buf_user: ${{ secrets.BUF_USER }}
          buf_api_token: ${{ secrets.BUF_API_TOKEN }}
      - run: buf build
      - run: buf lint
      - run: buf breaking --against ".git#branch=main"
```

Key: `fetch-depth: 0` so git has the baseline commit available. `fetch-depth: 1`
makes buf error because it cannot reach the baseline.

The official `bufbuild/buf-setup-action` and `bufbuild/buf-breaking-action` are
convenient but the raw CLI calls above work without them.

## Per-PR failure comment

```yaml
      - if: failure()
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: proto-gate
          message: |
            ❌ `buf breaking` failed. See log:
            ```
            ${{ steps.breaking.outputs.stdout }}
            ```
            Consult
            references/versioning-strategy.md
            for whether this change is genuinely required and how
            to do it safely (reserve, add new, deprecate old).
```
