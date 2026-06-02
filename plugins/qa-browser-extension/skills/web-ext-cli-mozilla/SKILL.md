---
name: web-ext-cli-mozilla
description: "Author, lint, run, build, and sign a Firefox / Chromium WebExtension using Mozilla's `web-ext` CLI v8. Covers `web-ext lint` (addons-linter wrapper, JSON output for CI), `web-ext run` (temporary install in firefox-desktop / firefox-android / chromium targets with hot-reload), `web-ext build` (deterministic zip), and `web-ext sign` (AMO submission API, listed vs unlisted channels, JWT credentials). Use when the extension targets Firefox (signing is mandatory for distribution) or when cross-browser test runs need a single CLI that drives both Firefox and Chromium against the same source tree. For Playwright-driven MV3 popup / content-script fixtures see `qa-modern-web/browser-extension-tests`. This plugin covers Firefox + Chrome extension lifecycle, MV2 → MV3 migration, host-permission prompts, and `storage.sync` vs `storage.local` semantics."
rating: 24
d6: 4
archetype: S1
keywords:
  - web-ext
  - firefox
  - amo
  - addons-linter
  - browser-extension
---

# web-ext-cli-mozilla

## Overview

`web-ext` is Mozilla's reference CLI for WebExtension development.
Per the [mozilla/web-ext README][we-readme], it bundles five
subcommands: `run`, `lint`, `sign`, `build`, and `docs`. `web-ext`
v8 added a `dump-config` subcommand and reworked the signing flow
to use the AMO submission API by default (per the
[web-ext command reference][we-cmd]).

This skill wraps `web-ext` for test runs. Composes with:

- [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md)
  for the manifest fields `web-ext lint` enforces.
- [`mv2-to-mv3-migration-test-checklist`](../mv2-to-mv3-migration-test-checklist/SKILL.md)
  for migration-time lint rules.

For Playwright-driven MV3 popup / content-script fixtures see
[`qa-modern-web/browser-extension-tests`](../../../qa-modern-web/skills/browser-extension-tests/SKILL.md).
That skill is Chromium-only and assumes the extension is built;
`web-ext` is the lint+run+build+sign tool that produces the
artifact and validates it pre-flight on either browser.

[we-readme]: https://github.com/mozilla/web-ext
[we-cmd]: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/

## When to use

- Validating a manifest + sources against the AMO linter rules
  before submission.
- Driving a fresh Firefox temporary profile to test an extension
  end-to-end without manual install.
- Building a deterministic `.zip` for upload to AMO or for CI
  artefact archiving.
- Signing an extension for self-distribution (unlisted) or AMO
  listing (listed).
- Running the same source on `chromium` from one CLI for parity
  smoke-tests (per `--target chromium` in [we-cmd]).

## Authoring

### Install

Per [we-readme], install globally or per-project:

```bash
# Global
npm install --global web-ext

# Per-project (preferred for CI determinism)
npm install --save-dev web-ext
```

Mozilla recommends "the current LTS (long term support) version of
NodeJS" (per [we-readme]) - verify your CI image matches before
asserting reproducibility.

### Project layout assumed by `web-ext`

```
my-extension/
  manifest.json
  background.js
  content.js
  popup/
    popup.html
    popup.js
  icons/
  web-ext-config.cjs   # optional, see below
```

`web-ext` operates on the directory passed via `--source-dir` (or
`-s`); per [we-cmd], `--source-dir` is a **global option** - 
available to every subcommand - and `--artifacts-dir` (default
`./web-ext-artifacts`) controls where `build` / `sign` write zips.

### Optional `web-ext-config.cjs`

A config file lets CI assert the same flags every run. Run
`web-ext dump-config` (new in v8 per [we-cmd]) to print the
resolved configuration as JSON for diffing.

```js
// web-ext-config.cjs
module.exports = {
  sourceDir: './dist',
  artifactsDir: './build/artifacts',
  run: {
    firefox: 'nightly',
    startUrl: ['about:debugging#/runtime/this-firefox'],
  },
  build: {
    overwriteDest: true,
    filename: 'my-extension-{version}.zip',
  },
  lint: {
    warningsAsErrors: true,
    output: 'json',
  },
};
```

## Running

### Lint

`web-ext lint` wraps [`mozilla/addons-linter`][we-readme] and
emits AMO-compatible warnings. Per [we-cmd] the flag list is:

| Flag | Effect |
|---|---|
| `--output` / `-o` | `json` or `text` |
| `--metadata` | output only metadata as JSON |
| `--pretty` | format JSON output |
| `--self-hosted` | declares self-hosting; disables AMO-related messages |
| `--boring` | disables colored shell output |
| `--warnings-as-errors` / `-w` | treat warnings as errors |

CI-friendly invocation:

```bash
web-ext lint \
  --source-dir ./dist \
  --output json \
  --pretty \
  --warnings-as-errors > lint-report.json
```

`--warnings-as-errors` is the right CI default - by [we-cmd] this
escalates lint warnings (e.g., unsupported manifest fields, MV2-only
APIs flagged for MV3) into a non-zero exit code.

### Run (Firefox desktop)

Per [we-cmd], `web-ext run` builds the extension and installs it
into a fresh temporary Firefox profile, then watches the source
directory for changes and reloads on edit:

```bash
web-ext run \
  --source-dir ./dist \
  --firefox=firefox \
  --start-url 'about:debugging#/runtime/this-firefox'
```

Firefox alias values accepted by `--firefox` (per [we-cmd]):
`firefox`, `beta`, `nightly`, `deved` / `firefoxdeveloperedition`,
or a full path to a Firefox binary.

To pin a profile (e.g., to retain auth state between runs):

```bash
web-ext run \
  --firefox-profile=qa-profile \
  --profile-create-if-missing \
  --keep-profile-changes
```

`--keep-profile-changes` (per [we-cmd]) persists profile
modifications across runs - useful for snapshot-style tests.

### Run on Chromium

Per [we-cmd] (the `--target` flag), `web-ext run` supports three
targets: `firefox-desktop`, `firefox-android`, and `chromium`. To
smoke-test cross-browser:

```bash
web-ext run \
  --source-dir ./dist \
  --target chromium \
  --chromium-binary "$(which chromium)"
```

This is the lowest-effort way to verify a Firefox-developed
extension at least loads on Chromium without a full Playwright
fixture. Deep Chromium-specific test surface lives in
[`chrome-extension-test-loader`](../chrome-extension-test-loader/SKILL.md)
and
[`playwright-extension-fixtures`](../playwright-extension-fixtures/SKILL.md).

### Run on Firefox Android

```bash
web-ext run \
  --target firefox-android \
  --android-device emulator-5554 \
  --firefox-apk org.mozilla.firefox
```

Per [we-cmd], the `--adb-*` family of flags wires `adb` for the
device handshake (`--adb-bin`, `--adb-port`, `--adb-host`,
`--adb-device`/`--android-device`, `--adb-remove-old-artifacts`).

### Build

```bash
web-ext build \
  --source-dir ./dist \
  --artifacts-dir ./build/artifacts \
  --overwrite-dest \
  --filename 'my-extension-{version}.zip'
```

Per [we-cmd], `--filename` / `-n` defaults to `{name}-{version}.zip`.
`--overwrite-dest` / `-o` is required when the same artefact path
already exists (e.g., re-running build in the same CI job).

### Sign

Per [we-cmd], `web-ext sign` v8 uses the AMO submission API by
default; `--channel` is **required**.

```bash
export WEB_EXT_API_KEY='user:12345:1'
export WEB_EXT_API_SECRET='abcdef...'

web-ext sign \
  --source-dir ./dist \
  --channel listed \
  --amo-metadata ./amo-metadata.json \
  --upload-source-code ./source.tar.gz
```

Channel semantics (quoted from [we-cmd]):

> "with `listed` the extension 'gets submitted for public listing';
> with `unlisted` it 'gets submitted for signing for
> self-distribution.'"

| Flag | Effect |
|---|---|
| `--api-key` (env `$WEB_EXT_API_KEY`) | JWT issuer for AMO API |
| `--api-secret` (env `$WEB_EXT_API_SECRET`) | JWT secret |
| `--channel` | required; `listed` or `unlisted` |
| `--amo-metadata` | path to JSON with AMO listing metadata; required for first listed version |
| `--upload-source-code` | path to source archive (v8 addition) |
| `--timeout` | default 300000 ms |
| `--approval-timeout` | default 900000 ms (v8 addition) |
| `--amo-base-url` | default `https://addons.mozilla.org/api/v5/` |

To submit updates, per [we-cmd] the manifest **must include an
extension ID** (`browser_specific_settings.gecko.id` for Firefox).

## Parsing results

### Lint output shape

With `--output json --pretty`, `web-ext lint` emits an
addons-linter report:

```json
{
  "count": 2,
  "summary": { "errors": 1, "notices": 0, "warnings": 1 },
  "metadata": { "manifestVersion": 3, "type": "extension", ... },
  "errors": [
    {
      "_type": "error",
      "code": "MANIFEST_FIELD_INVALID",
      "message": "...",
      "description": "...",
      "file": "manifest.json",
      "line": 12,
      "column": 5
    }
  ],
  "warnings": [...]
}
```

(Field shape per [we-readme]'s reference to `mozilla/addons-linter`;
exact fields stable across recent versions but spot-check the
addons-linter changelog before pinning a parser.)

Parse with `jq`:

```bash
jq '.summary.errors + .summary.warnings' lint-report.json
# > 0 means CI should fail under --warnings-as-errors
```

### Build output

`web-ext build` prints the artefact path to stdout and exits non-zero
on lint failure (build runs lint first). Capture via:

```bash
artefact=$(web-ext build -s ./dist -a ./out --overwrite-dest \
  | grep 'Your web extension is ready' \
  | sed -E 's/.*: (.+)$/\1/')
```

### Sign output

`web-ext sign` exits zero on signed-and-downloaded; non-zero on AMO
rejection or timeout. Signed `.xpi` lands in `--artifacts-dir`.

## CI integration

GitHub Actions example, gated lint + build on every PR + sign on
tag:

```yaml
name: extension-ci
on:
  pull_request:
  push:
    tags: ['v*']

jobs:
  lint-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: 'lts/*' }
      - run: npm ci
      - name: Lint
        run: npx web-ext lint -s ./dist -o json --pretty -w > lint-report.json
      - name: Build
        run: npx web-ext build -s ./dist -a ./out --overwrite-dest
      - uses: actions/upload-artifact@v4
        with:
          name: lint+xpi
          path: |
            lint-report.json
            out/*.zip

  sign:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: lint-build
    runs-on: ubuntu-latest
    env:
      WEB_EXT_API_KEY: ${{ secrets.AMO_JWT_ISSUER }}
      WEB_EXT_API_SECRET: ${{ secrets.AMO_JWT_SECRET }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: 'lts/*' }
      - run: npm ci
      - name: Sign (listed)
        run: |
          npx web-ext sign \
            -s ./dist \
            --channel listed \
            --amo-metadata ./amo-metadata.json
```

`--warnings-as-errors` in the lint step is what gates the PR - per
[we-cmd] it converts warnings into exit-1.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `web-ext sign` without `--channel` | v8 requires `--channel` per [we-cmd]; command refuses to run | Always specify `listed` or `unlisted` |
| Re-using the same profile (`--firefox-profile`) without `--keep-profile-changes` | Profile changes lost between runs; tests appear non-deterministic | Add `--keep-profile-changes` per [we-cmd] |
| `web-ext lint` without `-w` in CI | Warnings silently pass; AMO submission still rejects | Use `--warnings-as-errors` / `-w` |
| Signing without an extension ID in manifest | Update submission fails per [we-cmd] | Add `browser_specific_settings.gecko.id` (see `manifest-v3-test-surface-reference`) |
| Using `--firefox-preview` (removed in v8) | Flag removed; command errors | Pin web-ext version or migrate to the supported aliases |
| Committing `web-ext-artifacts/` | Repo bloats with binaries | Add to `.gitignore`; rely on CI artefact upload |
| Calling `web-ext run` on production builds | Hot-reload modifies the profile; not a smoke-test surface | Use `web-ext build` + a separate Playwright fixture |

## Limitations

- **Linter ≠ tests.** `web-ext lint` catches manifest issues and
  AMO policy violations; it does not exercise the extension's
  behaviour. Pair with `playwright-extension-fixtures` for
  behavioural assertions.
- **Chromium target is run-only.** `web-ext run --target chromium`
  installs the unpacked extension into a fresh Chromium profile,
  but per [we-cmd] does not provide the AMO-style signing path - 
  Chrome Web Store has its own publishing flow.
- **No Firefox MV3 parity check.** `web-ext lint` does not warn
  when a manifest uses a key that's MV3-supported in Chrome but
  not Firefox (or vice versa); cross-reference the
  [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md)
  matrix manually.
- **Approval timeout caps signing throughput.** `--approval-timeout`
  defaults to 900000 ms (15 min) per [we-cmd]; AMO can take longer
  in queue, requiring follow-up polling.
- **Self-hosted mode disables AMO warnings.** `--self-hosted` (per
  [we-cmd]) is for enterprise self-distribution; do not enable on
  AMO-bound builds.

## References

- Mozilla `web-ext` README (install, basic usage) - 
  [github.com/mozilla/web-ext][we-readme].
- Extension Workshop - `web-ext` v8 command reference (every flag
  on every subcommand) - [we-cmd].
- Mozilla `addons-linter` (what `web-ext lint` wraps) - 
  github.com/mozilla/addons-linter.
- Composes:
  [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md).
- Siblings:
  [`chrome-extension-test-loader`](../chrome-extension-test-loader/SKILL.md),
  [`playwright-extension-fixtures`](../playwright-extension-fixtures/SKILL.md).
