# Anti-patterns and limitations

[pw-fix]: https://playwright.dev/docs/test-fixtures
[pw-auth]: https://playwright.dev/docs/auth

## Anti-patterns

| Anti-pattern                                                                | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Worker-scoped fixture for state that **changes** between tests              | Tests on the same worker pollute each other; intermittent failures.       | Move to test scope. Per [pw-fix][pw-fix]: test-scoped fixtures "are torn down immediately after". |
| Test-scoped fixture for **immutable** expensive state (e.g. logged-in user) | Per-test login = N × ~1s. CI time balloons.                              | Worker scope + `workerInfo.workerIndex` per [pw-fix][pw-fix]. |
| `beforeAll` for shared state in a parallel suite                             | `beforeAll` runs once per spec file, not once per worker; doesn't compose. | Worker-scoped fixture with the right `use()` boundary. |
| Teardown that depends on a downstream fixture's setup                        | Reverse-order teardown means the dependency is gone when teardown runs.   | Invert composition: dependent fixture extends the dependency. |
| Manual `await context.close()` inside a test                                  | Bypasses Playwright's cleanup; flake on the next test.                    | Let the page/context fixture handle close in its teardown. |
| Hard-coded port / DB name in fixtures                                         | Two parallel workers fight over the same resource.                        | Derive from `workerInfo.workerIndex` per [pw-fix][pw-fix]. |
| Storing `playwright/.auth/*.json` in git                                       | Per [pw-auth][pw-auth]: "these files contain sensitive cookies and headers". | `.gitignore` the auth dir; reauthenticate in CI per worker. |
| One mega-fixture that bundles auth+db+flags                                  | Tests can't opt out of pieces; one tweak breaks everyone.                  | Atomic fixtures composed via `extend` per Step 6. |

## Limitations

- **No mid-test scope changes.** A worker-scoped fixture can't be
  reset for one test without re-architecting; if mid-test reset is
  needed, the fixture should be test-scoped.
- **Session storage isn't auto-captured.** Per [pw-auth][pw-auth]:
  "Manually persist session data since Playwright doesn't
  automatically capture it" - for sessionStorage-based auth, write
  custom serialization in the fixture.
- **Teardown failures don't fail the test.** A throw inside the
  post-`use()` block produces a warning, not a failure. Wrap
  critical teardown in a runtime check that fails the next test if
  state is dirty.
- **Fixture timeout is per-fixture, not per-test.** Long auth
  fixtures need `{ timeout: 60_000 }`; the test's own timeout is
  separate.
