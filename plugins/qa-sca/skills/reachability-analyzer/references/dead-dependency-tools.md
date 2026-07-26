# Dead-dependency tools by ecosystem

Per-ecosystem detail for producing `unused-deps.txt`: config files, flags, exit
codes, and false-positive suppression. Run the tool for your ecosystem, then
extract the unused names for the SCA cross-reference step.

## JavaScript / TypeScript: knip (preferred) or depcheck

**knip** is the current recommended tool for unused-dependency detection in JS
projects. Per [github.com/webpro-nl/knip](https://github.com/webpro-nl/knip), it
detects unused files, exports, and dependencies including dev-only packages.

```bash
npx knip --reporter json > knip-report.json
# Extract unused dependency names for the cross-reference list
npx knip --reporter json | jq -r '.dependencies[].name' > unused-deps.txt
```

**depcheck** remains usable for existing setups. Per
[github.com/depcheck/depcheck](https://github.com/depcheck/depcheck), the
project was archived in June 2025; the maintainers recommend switching to knip
for new setups. For teams still on depcheck:

```bash
npx depcheck --json > depcheck-report.json
# Extract unused package names
jq -r '.dependencies[],.devDependencies[]' depcheck-report.json > unused-deps.txt
```

Per [github.com/depcheck/depcheck](https://github.com/depcheck/depcheck), the
`--json` flag produces an object with `dependencies` (unused production deps)
and `devDependencies` (unused dev deps) as arrays of package-name strings.
Packages in `devDependencies` that never appear in the production dep tree are
prime candidates for `reachable: false` annotation on any CVEs they carry.

Suppress known false positives via `.depcheckrc`:

```yaml
# .depcheckrc
ignores: ["babel-register", "eslint-*"]
ignore-patterns: ["dist", "coverage"]
```

### Scope narrowing: dev vs production

Dev dependencies in non-production scope are already excluded from many
scanners. Per [github.com/depcheck/depcheck](https://github.com/depcheck/depcheck),
running `npm audit --omit=dev` skips devDependencies entirely. Always separate
production and dev unused-dep lists:

```bash
# Separate production unused from dev unused
jq -r '.dependencies[]' depcheck-report.json > unused-prod.txt
jq -r '.devDependencies[]' depcheck-report.json > unused-dev.txt
```

## Python: vulture

Per [github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture),
vulture detects unused imports, functions, classes, and variables through static
analysis. For dependency reachability, unused imports are the direct signal.

```bash
pip install vulture
vulture src/ --min-confidence 90 > vulture-report.txt
```

Per [github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture),
`--min-confidence 90` targets imports specifically (confidence 90% for unused
imports). Lower values include functions and variables, which is noisier for
the dep-CVE cross-reference task.

Extract the unused-import lines:

```bash
grep "unused import" vulture-report.txt | sed "s/:.*unused import '\(.*\)'.*/\1/" > unused-imports.txt
```

Map import names back to pip package names using `pip show` or a manually
maintained `import-to-package.txt` map, since Python import names often differ
from PyPI package names (e.g. `import PIL` comes from `Pillow`).

Configure via `pyproject.toml` per
[github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture):

```toml
[tool.vulture]
paths = ["src/"]
min_confidence = 90
exclude = ["tests/", "migrations/"]
ignore_names = ["celery_app", "urlpatterns"]
```

Suppress known false positives (e.g. plugin registrations, dynamic imports)
by generating a whitelist:

```bash
vulture src/ --make-whitelist > whitelist.py
# Then re-run including the whitelist
vulture src/ whitelist.py --min-confidence 90
```

Per [github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture),
exit code `3` means dead code found; `0` means clean.

## Rust: cargo-machete

Per [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete),
cargo-machete detects unused `[dependencies]` in `Cargo.toml` through fast
static analysis.

```bash
cargo install cargo-machete
cargo machete
```

Per [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete),
exit code `0` means no unused dependencies found; exit code `1` means at least
one unused dependency was detected; exit code `2` signals a processing error.

For more accurate detection when crates use renamed or feature-gated imports,
use `--with-metadata`:

```bash
cargo machete --with-metadata
```

Per [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete),
`--with-metadata` calls `cargo metadata --all-features` to resolve final
dependency names, which catches renames that simple text search misses.

Suppress false positives (e.g. proc-macro crates loaded at compile time only)
via `Cargo.toml` metadata per
[github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete):

```toml
[package.metadata.cargo-machete]
ignored = ["prost", "openssl"]

[package.metadata.cargo-machete.renamed]
rustls-webpki = "webpki"
```

Capture the unused-dep list:

```bash
cargo machete 2>&1 | grep "unused dependency" | awk '{print $NF}' > unused-deps.txt
```
