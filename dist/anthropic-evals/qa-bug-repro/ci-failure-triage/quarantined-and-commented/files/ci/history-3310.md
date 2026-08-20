## Per-test history, last 50 smoke runs

| Test | Failures in 50 | Shape of the failures |
|---|---|---|
| tests/notifications.spec.ts:88 | 6 | all six are the same 15000ms toast-visibility timeout; 4 of the 6 passed on the next run of the same commit |
| tests/billing/invoice.spec.ts:57 | 1 (this run) | 31 consecutive passes before it; the merge-queue retry of the same commit at 11:19 produced the identical 14382 |

- Runner image `ubuntu-24.04 / 20260810.1.0`, unchanged for 11 days.
- Issue #4412, referenced in the invoice test comment, was closed 2026-03-04 as
  "could not reproduce". It is not linked from flake-list.yml.

## Changes in the window

```
$ git log --oneline --since=2026-08-13
c8e1f40 (2026-08-14 09:12) feat(billing): apply per-line tax rounding
77ab205 (2026-08-13 16:40) chore(deps): bump eslint to 9.12.0
```

```
$ git show c8e1f40 -- src/billing/buildInvoice.ts
@@ export function buildInvoice(lines: Line[]) {
-  const net = lines.reduce((sum, l) => sum + l.qtyCents, 0);
-  const totalCents = Math.round(net * (1 + lines[0].taxRate));
+  const totalCents = lines.reduce(
+    (sum, l) => sum + Math.round(l.qtyCents * (1 + l.taxRate)),
+    0,
+  );
   return { currency: 'EUR', totalCents };
 }
```
