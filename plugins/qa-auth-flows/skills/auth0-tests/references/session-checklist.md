# Auth0 session-management checklist

Auth0-managed sessions (refresh tokens, silent auth): see
`session-management-test-author` for the cross-tool pattern.
Auth0-specific: refresh-token rotation is configurable
per-application; tests should verify the rotation behaves as
configured.

The base pattern, per [OWASP ASVS][asvs] V3 (Session Management):
cover all nine points against the application's own session cookie,
then add the Auth0-specific rotation assertion.

1. Cookie attributes on the app session cookie: `Secure`,
   `HttpOnly`, `SameSite=Strict` (or `Lax` only if the session must
   survive the Auth0 callback redirect), a non-parent `Domain`, and
   a finite `Max-Age` / `Expires`.
2. Session-fixation defense - capture the session ID before login,
   log in carrying that cookie, assert the post-login ID differs.
   Unchanged ID is a **critical** finding.
3. Idle timeout - activity at +5 min still 200; +31 min of
   inactivity returns 401 / redirects to login.
4. Absolute timeout - continuous activity does NOT extend the
   session past its maximum lifetime.
5. Concurrent-session policy - second login either revokes the
   first session or is rejected; assert whichever the app declares.
6. Logout is server-side - replay the captured cookie value after
   logout and assert 401. Clearing the cookie client-side only is
   **critical**.
7. Logout-all-devices invalidates every other session for the user.
8. CSRF token required on state-changing endpoints (or
   `SameSite=Strict` covering the same ground).
9. Session binding per threat model (User-Agent / device
   fingerprint by default; TLS binding per RFC 8473 when both ends
   are controlled; IP binding only if mobile-network churn is
   acceptable).

Use a time-freezing fixture (e.g. `freezegun`) for steps 3 and 4 so
timeout tests don't sleep.

[asvs]: https://owasp.org/www-project-application-security-verification-standard/
