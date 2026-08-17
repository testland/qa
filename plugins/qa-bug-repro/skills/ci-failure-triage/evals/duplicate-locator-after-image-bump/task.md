# Settings save flow broke the morning the runner image rolled

## Problem Description

The `settings-save` end-to-end test has failed on every run since Tuesday
morning. The provider rolled a new runner image at 05:40 that day, which
brought a new Chrome with it, and the platform channel has settled on that as
the cause. There is already a PR open to pin the runner image to the previous
version, and a follow-up ticket to "review our locator strategy for Chrome
compatibility".

Pinning the image means we stop getting security updates on the runner and
somebody has to own unpinning it later, so the platform lead asked for a second
opinion before merging that PR. Someone on the team ran the same commit against
the older pinned image yesterday afternoon to prove the point; the result is in
the attached files.

We want a written determination of what this failure actually is and who owns
the next action, so the pinning PR is either merged or closed today.

## Output Specification

Produce `triage-settings-save.md` containing:

1. What kind of failure this is and who owns the next action.
2. The evidence from the attached files that supports it, quoting the specific
   lines, timestamps and values you relied on.
3. The other explanations you considered and, for each, the specific observed
   value that rules it out.
4. A direct recommendation on the image-pinning PR.

If the attached material does not settle the question, say so and name exactly
what you would need to collect. Do not fill a gap with the most likely story.

Out of scope: writing the fix, editing tests or components, and drafting a
bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/e2e-5510.log ===============
2026-08-13T06:12:04Z ##[group]Runner Image
2026-08-13T06:12:04Z Image: ubuntu-24.04   Version: 20260812.1.0   (rolled 2026-08-12 05:40 UTC)
2026-08-13T06:12:04Z ##[endgroup]
2026-08-13T06:12:07Z ##[group]Run npx playwright test --project=chromium
2026-08-13T06:12:09Z Using browser chromium 141.0.7390.54 (playwright build 1194)
2026-08-13T06:12:48Z   ok  tests/settings/profile.spec.ts:11:3 › edits a display name (3.1s)
2026-08-13T06:13:15Z   x   tests/settings/settings-save.spec.ts:26:3 › saves notification preferences
2026-08-13T06:13:15Z     Error: locator.click: Error: strict mode violation:
2026-08-13T06:13:15Z       getByRole('button', { name: 'Save' }) resolved to 2 elements:
2026-08-13T06:13:15Z         1) <button class="btn-primary" type="submit">Save</button>
2026-08-13T06:13:15Z              aka getByRole('button', { name: 'Save' }).first()
2026-08-13T06:13:15Z         2) <button class="toolbar-action" type="button">Save</button>
2026-08-13T06:13:15Z              aka getByRole('button', { name: 'Save' }).nth(1)
2026-08-13T06:13:15Z       at tests/settings/settings-save.spec.ts:31:52
2026-08-13T06:13:41Z   ok  tests/settings/security.spec.ts:8:3 › rotates an API token (4.4s)
2026-08-13T06:13:52Z   1 failed, 34 passed (1m45s)
2026-08-13T06:13:53Z ##[error]Process completed with exit code 1.

=============== FILE: logs/pinned-image-rerun.log ===============
# Manual run, 2026-08-14 15:20 UTC, same commit as e2e-5510 (9c40b17),
# workflow patched to `runs-on: ubuntu-24.04-20260805.2` to reproduce the
# pre-roll environment.
2026-08-14T15:20:11Z Image: ubuntu-24.04   Version: 20260805.2.0
2026-08-14T15:20:14Z Using browser chromium 139.0.7258.66 (playwright build 1187)
2026-08-14T15:20:55Z   x   tests/settings/settings-save.spec.ts:26:3 › saves notification preferences
2026-08-14T15:20:55Z     Error: locator.click: Error: strict mode violation:
2026-08-14T15:20:55Z       getByRole('button', { name: 'Save' }) resolved to 2 elements:
2026-08-14T15:20:55Z         1) <button class="btn-primary" type="submit">Save</button>
2026-08-14T15:20:55Z         2) <button class="toolbar-action" type="button">Save</button>
2026-08-14T15:20:55Z   1 failed, 34 passed (1m41s)

=============== FILE: ci/history-5510.md ===============
## `tests/settings/settings-save.spec.ts:26`, last 50 runs

| Run | Started (UTC) | Image version | Result |
|---|---|---|---|
| 5510 | 2026-08-13 06:12 | 20260812.1.0 | fail |
| 5504 | 2026-08-12 06:11 | 20260812.1.0 | fail |
| 5499 | 2026-08-11 22:30 | 20260805.2.0 | fail |
| 5496 | 2026-08-11 18:44 | 20260805.2.0 | fail |
| 5491 | 2026-08-11 17:02 | 20260805.2.0 | pass |
| 5440-5491 (46 runs, 2026-07-18 to 2026-08-11 17:02) | | 20260805.2.0 and earlier | all pass |

- The runner image rolled from 20260805.2.0 to 20260812.1.0 at
  2026-08-12 05:40 UTC.
- No quarantine list, flake list, or skip annotation exists in this repository.
- No other test has failed in the window.

## Changes in the window

```
$ git log --oneline --since=2026-08-10
9c40b17 (2026-08-11 18:20) feat(settings): add a sticky action toolbar
7ee2d04 (2026-08-10 09:15) docs: update the settings screenshots
```

```
$ git show 9c40b17 -- src/settings/SettingsToolbar.tsx
+export function SettingsToolbar({ onSave, onDiscard }: Props) {
+  return (
+    <div className="sticky-toolbar">
+      <button className="toolbar-action" type="button" onClick={onDiscard}>Discard</button>
+      <button className="toolbar-action" type="button" onClick={onSave}>Save</button>
+    </div>
+  );
+}
```
