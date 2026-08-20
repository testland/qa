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
