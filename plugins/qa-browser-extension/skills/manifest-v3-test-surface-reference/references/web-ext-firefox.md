# web-ext - Mozilla's CLI for Firefox WebExtension testing

Companion reference for `manifest-v3-test-surface-reference`. Consult when
the extension targets Firefox (signing is mandatory for distribution) or when
cross-browser test runs need a single CLI that drives both Firefox and
Chromium against the same source tree.

`web-ext` is Mozilla's reference CLI for WebExtension development. Per the
[mozilla/web-ext README][we-readme] it bundles `run`, `lint`, `sign`,
`build`, and `docs`; v8 added `dump-config` and reworked signing to use the
AMO submission API by default (per the [web-ext command reference][we-cmd]).
`--source-dir` / `-s` is a global option; `--artifacts-dir` (default
`./web-ext-artifacts`) controls where `build` / `sign` write zips.

[we-readme]: https://github.com/mozilla/web-ext
[we-cmd]: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/

## Install

```bash
npm install --save-dev web-ext    # per-project, preferred for CI determinism
```

Mozilla recommends the current Node LTS (per [we-readme]). A
`web-ext-config.cjs` file pins flags per run; `web-ext dump-config` (v8, per
[we-cmd]) prints the resolved configuration as JSON for diffing.

## Lint

`web-ext lint` wraps [`mozilla/addons-linter`][we-readme] and emits
AMO-compatible warnings. CI-friendly invocation:

```bash
web-ext lint \
  --source-dir ./dist \
  --output json \
  --pretty \
  --warnings-as-errors > lint-report.json
```

`--warnings-as-errors` / `-w` is the right CI default - per [we-cmd] it
escalates lint warnings (unsupported manifest fields, MV2-only APIs flagged
for MV3) into a non-zero exit code. Other flags: `--metadata`,
`--self-hosted` (disables AMO-related messages - never on AMO-bound builds),
`--boring`.

Output shape: `{ "count", "summary": { "errors", "notices", "warnings" },
"metadata", "errors": [{ "code", "message", "file", "line", "column" }], ... }`
(per addons-linter; spot-check its changelog before pinning a parser). Parse
with `jq '.summary.errors + .summary.warnings'`.

## Run

`web-ext run` builds the extension, installs it into a fresh temporary
Firefox profile, then watches the source directory and reloads on edit (per
[we-cmd]):

```bash
web-ext run \
  --source-dir ./dist \
  --firefox=firefox \
  --start-url 'about:debugging#/runtime/this-firefox'
```

`--firefox` aliases (per [we-cmd]): `firefox`, `beta`, `nightly`,
`deved` / `firefoxdeveloperedition`, or a binary path. To pin a profile:
`--firefox-profile=qa-profile --profile-create-if-missing
--keep-profile-changes` (the last persists profile modifications across
runs per [we-cmd]).

Targets (per [we-cmd] `--target`): `firefox-desktop`, `firefox-android`
(wired via the `--adb-*` flag family), and `chromium`:

```bash
web-ext run --source-dir ./dist --target chromium --chromium-binary "$(which chromium)"
```

The chromium target is the lowest-effort parity smoke-test; deep Chromium
test surface lives in `playwright-extension-fixtures`.

## Build

```bash
web-ext build -s ./dist -a ./build/artifacts --overwrite-dest \
  --filename 'my-extension-{version}.zip'
```

Per [we-cmd], `--filename` defaults to `{name}-{version}.zip`;
`--overwrite-dest` is required when the artefact path already exists. Build
runs lint first and exits non-zero on lint failure.

## Sign

Per [we-cmd], `web-ext sign` v8 uses the AMO submission API by default and
`--channel` is **required**:

```bash
export WEB_EXT_API_KEY='user:12345:1'
export WEB_EXT_API_SECRET='abcdef...'

web-ext sign -s ./dist --channel listed \
  --amo-metadata ./amo-metadata.json \
  --upload-source-code ./source.tar.gz
```

Channel semantics (quoted from [we-cmd]): with `listed` the extension "gets
submitted for public listing"; with `unlisted` it "gets submitted for signing
for self-distribution." Key flags: `--api-key` / `--api-secret` (JWT for the
AMO API), `--amo-metadata` (required for a first listed version),
`--timeout` (default 300000 ms), `--approval-timeout` (default 900000 ms,
v8) - AMO can take longer in queue, requiring follow-up polling. Update
submissions require an extension ID in the manifest
(`browser_specific_settings.gecko.id`) per [we-cmd]. The signed `.xpi` lands
in `--artifacts-dir`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `web-ext sign` without `--channel` | v8 requires it per [we-cmd]; command refuses to run | Always specify `listed` or `unlisted` |
| Re-using a profile without `--keep-profile-changes` | Profile changes lost between runs; tests appear non-deterministic | Add the flag per [we-cmd] |
| `web-ext lint` without `-w` in CI | Warnings silently pass; AMO submission still rejects | `--warnings-as-errors` |
| Signing without an extension ID in the manifest | Update submission fails per [we-cmd] | Add `browser_specific_settings.gecko.id` (see SKILL.md matrix) |
| Committing `web-ext-artifacts/` | Repo bloats with binaries | `.gitignore` + CI artefact upload |

## Limitations

- **Linter is not tests.** `web-ext lint` catches manifest issues and AMO
  policy violations; it does not exercise behaviour - pair with
  `playwright-extension-fixtures`.
- **Chromium target is run-only.** No AMO-style signing path for Chrome;
  the Chrome Web Store has its own publishing flow.
- **No Firefox MV3 parity check.** `web-ext lint` does not warn when a key
  is MV3-supported in Chrome but not Firefox (or vice versa);
  cross-reference the SKILL.md matrix manually.

## References

- Mozilla `web-ext` README - [we-readme].
- Extension Workshop `web-ext` v8 command reference (every flag on every
  subcommand) - [we-cmd].
- Mozilla `addons-linter` (what `web-ext lint` wraps) -
  https://github.com/mozilla/addons-linter
