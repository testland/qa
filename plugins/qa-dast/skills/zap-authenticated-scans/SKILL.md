---
name: zap-authenticated-scans
description: "Configures authenticated DAST sessions in ZAP - ZAP Context + Authentication Method (form, JSON, script, browser-based, HTTP/NTLM), Session Management strategy (cookie, header, script), Verification Strategy (regex indicators, poll-URL), CSRF token handling, OAuth/bearer header injection, logged-in/logged-out indicator calibration, and context XML export for use with `-n` in baseline and full scans. Use when the team needs DAST coverage of authenticated routes - the most common DAST gap and the hardest DAST setup to get right."
metadata:
  keywords: "zap, authentication, dast, context, oauth, bearer, csrf, session, login"
---

# zap-authenticated-scans

## Overview

Unauthenticated DAST scans cover only the public attack surface. For most
apps, 70-90% of routes sit behind a login wall. This skill is a
**build-an-X workflow** that walks the full authenticated session setup:
ZAP Context creation, choosing the right Authentication Method, wiring
Session Management, calibrating logged-in/out indicators, handling CSRF
tokens, injecting OAuth/bearer headers, and exporting the context file for
CI reuse.

Nearest neighbors and differentiation axes:

- [`zap-baseline`](../zap-baseline/SKILL.md) covers the `-n context_file`
  flag but not how to build that file.
- [`dast-scan-cadence-author`](../dast-scan-cadence-author/SKILL.md) covers cadence
  (PR-blocking vs. nightly vs. release), not auth wiring.
- Neither neighbor covers CSRF handling, bearer injection, OAuth flows,
  verification-strategy calibration, or context XML export.

## Step 1 - Create a ZAP Context

Per [zaproxy.org/docs/desktop/start/features/authentication/][zap-auth],
authentication in ZAP is always scoped to a **Context** - a named set of
URLs. Create one before touching any auth setting:

1. Open ZAP desktop. In the Sessions dialog: `Session Properties > Contexts > Add`.
2. Set the Context Name (e.g., `myapp-auth`).
3. Set the Include pattern to cover all app URLs:
   `https://app.example.com/.*`
4. Add exclude patterns for logout URLs to avoid the spider logging itself
   out during a scan: `https://app.example.com/logout.*`

All auth settings attach to this Context. CLI scans reference it via
`-n context.xml` (Step 9).

[zap-auth]: https://www.zaproxy.org/docs/desktop/start/features/authentication/

## Step 2 - Choose the Authentication Method

Per [zaproxy.org/docs/desktop/start/features/authmethods/][zap-methods],
ZAP supports five built-in methods. Choose by app login mechanism:

| App login type | Method to use |
|---|---|
| HTML form POST with username + password fields | Form-Based |
| JSON POST `{"username":"...","password":"..."}` | JSON-Based |
| HTTP Basic / Digest / NTLM challenge | HTTP/NTLM |
| Custom flow (OTP, magic link, multi-step) | Script-Based |
| Modern browser-rendered SSO / OAuth redirect | Browser-Based (auth-helper addon) |

[zap-methods]: https://www.zaproxy.org/docs/desktop/start/features/authmethods/

## Step 3 - Configure Form-Based Authentication

Per [zap-methods][zap-methods], Form-Based auth requires:

- **Login URL**: the POST endpoint (e.g., `https://app.example.com/login`)
- **Login Request POST Data**: encodes credentials as URL params:
  `username={%username%}&password={%password%}`
  ZAP replaces `{%username%}` / `{%password%}` with User credentials at
  scan time. Never hardcode credentials in this field.
- **Username field** and **Password field** names (match the HTML `name`
  attributes).

Per [zap-methods][zap-methods], Form-Based auth supports re-authentication -
ZAP detects session expiry and re-logs in automatically mid-scan.

CSRF token handling for form login: if the login form contains an anti-CSRF
token field, configure its name in `Tools > Options > Anti CSRF Tokens`
(per [zap-auth][zap-auth]). ZAP fetches the login page, extracts the token,
and replays it with the POST automatically.

## Step 4 - Configure JSON-Based Authentication

Per [zap-methods][zap-methods], JSON-Based auth is for apps whose login
endpoint accepts a JSON body rather than form-encoded params:

- **Login URL**: the POST endpoint
- **Login Request POST Data**:
  `{"username":"{%username%}","password":"{%password%}"}`

ZAP sends `Content-Type: application/json` automatically. Supports
re-authentication. Use this for REST API login endpoints returning a
session cookie or JWT response body.

## Step 5 - Configure Script-Based Authentication

Per [zap-methods][zap-methods], Script-Based auth handles flows that
Form-Based and JSON-Based cannot: OTP-augmented logins, multi-step forms,
OAuth authorization-code flows with PKCE, or apps that rotate CSRF seeds
on every page load.

Prerequisites:
1. Install the **Script Console** add-on from the ZAP Marketplace.
2. In `Tools > Scripts`, create a new Authentication script
   (type: `Authentication`). ZAP ships example scripts at
   `scripts/authentication/` inside the ZAP installation directory.
3. The script receives `helper`, `paramsValues`, and `credentials`; it must
   call `helper.prepareMessage()` to build a login request and return the
   response.

Minimal skeleton (Groovy):

```groovy
def authenticate(helper, paramsValues, credentials) {
    def loginUrl = paramsValues.get("Login URL")
    def msg = helper.prepareMessage()
    msg.setRequestHeader("POST " + loginUrl + " HTTP/1.1\r\n" +
        "Host: app.example.com\r\n" +
        "Content-Type: application/json\r\n")
    def body = '{"user":"' + credentials.getParam("Username") + '",' +
               '"pass":"' + credentials.getParam("Password") + '"}'
    msg.setRequestBody(body)
    helper.sendAndReceive(msg)
    return msg
}
```

Select the script in `Session Properties > Context > Authentication >
Script-Based Authentication`, then set any script parameters.

For OAuth authorization-code flows: the script fetches the `/authorize`
redirect, extracts the `code`, POSTs to `/token`, and stores the resulting
`access_token` in a ZAP environment variable for header injection (Step 8).

## Step 6 - Configure Browser-Based Authentication (auth-helper addon)

Per [zaproxy.org/docs/desktop/addons/authentication-helper/][zap-helper],
the Authentication Helper add-on provides **Browser-Based Authentication**
for apps that use JS-rendered login pages, SSO redirects, or WebAuthn
flows that headless HTTP clients cannot replay:

```yaml
authentication:
  method: "browser"
  parameters:
    loginPageUrl: "https://app.example.com/login"
  verification:
    method: "autodetect"
sessionManagement:
  method: "autodetect"
```

ZAP launches Firefox, navigates to `loginPageUrl`, fills the username and
password fields, and captures the resulting session token. The
`autodetect` verification asks ZAP to find a suitable verification URL
automatically.

[zap-helper]: https://www.zaproxy.org/docs/desktop/addons/authentication-helper/

## Step 7 - Configure Session Management

Per [zaproxy.org/docs/desktop/start/features/sessionmanagement/][zap-session],
ZAP supports three session management methods. Set in
`Session Properties > Context > Session Management`:

| App session type | Method |
|---|---|
| Session ID in a cookie (`JSESSIONID`, `session`, etc.) | Cookie-Based Session Management |
| `Authorization` header (Basic, JWT Bearer) | HTTP Authentication Session Management |
| Custom header or token rotation | Script-Based Session Management |

Per [zap-session][zap-session], Cookie-Based "session is being tracked
through cookies" and tokens are imported from the HTTP Sessions Extension.

Per [zap-session][zap-session], Script-Based "is called whenever session
management actions are performed" and requires the Scripts Console add-on.

[zap-session]: https://www.zaproxy.org/docs/desktop/start/features/sessionmanagement/

## Step 8 - Inject OAuth/Bearer Tokens via Environment Variables

Per [zap-auth][zap-auth], ZAP exposes three environment variables for
header-based authentication injection - useful for pre-obtained bearer
tokens (OAuth client-credentials flow, API keys, CI-issued JWTs):

| Variable | Purpose |
|---|---|
| `ZAP_AUTH_HEADER_VALUE` | The token value (`Bearer eyJ...`) |
| `ZAP_AUTH_HEADER` | Header name (defaults to `Authorization` if unset) |
| `ZAP_AUTH_HEADER_SITE` | Restrict injection to this domain only |

Set these in the CI environment before running the scan:

```bash
export ZAP_AUTH_HEADER_VALUE="Bearer $(./scripts/get-ci-token.sh)"
export ZAP_AUTH_HEADER_SITE="app.example.com"

docker run --rm \
  -e ZAP_AUTH_HEADER_VALUE \
  -e ZAP_AUTH_HEADER_SITE \
  -v $(pwd):/zap/wrk/:rw \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t https://app.example.com -n /zap/wrk/context.xml -J report.json
```

For OAuth flows requiring a full authorization-code exchange, use Script-Based
auth (Step 5) to run the exchange inside ZAP and let ZAP manage token refresh
during the scan. Environment-variable injection is the right path for
client-credentials and static-API-key auth.

## Step 9 - Set Authentication Verification Strategy

Per [zaproxy.org/docs/desktop/start/features/authstrategies/][zap-verify],
ZAP uses an **Authentication Verification Strategy** to know whether a
request is executing as an authenticated user. Configure in
`Session Properties > Context > Authentication > Verification`:

**Logged-In Indicator**: a regex present in responses when the user is
authenticated. Examples:

- `\QWelcome, \E` (welcome banner with the username)
- `\Qhref="/logout"\E` (logout link in nav)
- `\Q"role":"user"\E` (JSON response field)

**Logged-Out Indicator**: a regex present in responses when the session
has expired. Examples:

- `\QPlease log in\E`
- `\Qlocation: /login\E` (redirect header)
- `HTTP/1\.1 401`

Per [zap-verify][zap-verify], four strategies are available:

| Strategy | Use when |
|---|---|
| Check Every Response | Traditional HTML apps (indicator in page body) |
| Check Every Request | Client-side sessions (JWT in `Authorization` header) |
| Check Every Request or Response | Mixed; SPA + API combo |
| Poll the Specified URL | Dedicated `/api/me` or `/session/check` endpoint |

Calibration steps:
1. Browse the app manually through ZAP proxy while logged in.
2. Right-click a response in the History tab that contains the logged-in
   text. Choose `Flag as Context > <context-name> Logged in indicator`.
   ZAP extracts the regex automatically.
3. Browse to a page after logging out. Right-click that response. Choose
   `Flag as Context > <context-name> Logged out indicator`.
4. Confirm both indicators in `Session Properties > Context > Authentication`.

[zap-verify]: https://www.zaproxy.org/docs/desktop/start/features/authstrategies/

## Step 10 - Add Users

Per [zaproxy.org/docs/desktop/start/features/users/][zap-users], users are
configured per-context at `Session Properties > Context > Users > Add`.
Each user stores credentials that map to the Authentication Method's
`{%username%}` / `{%password%}` placeholders.

Per [zap-users][zap-users]: "Authentication Methods define the process;
Users store the specific credentials needed for each user account." One
context can hold multiple users (admin, read-only, unauthenticated) to test
privilege separation in a single scan.

Never store plaintext credentials in the exported context XML committed to
version control. Reference environment variables in CI (Step 8 pattern) or
use ZAP's `-config` CLI flag to inject credentials at scan time:

```bash
zap-full-scan.py -t https://app.example.com \
  -n /zap/wrk/context.xml \
  -config context.users\(0\).name=scanner \
  -config context.users\(0\).credentials.username=$ZAP_USER \
  -config context.users\(0\).credentials.password=$ZAP_PASS
```

[zap-users]: https://www.zaproxy.org/docs/desktop/start/features/users/

## Step 11 - Export the Context XML

Once auth is confirmed working via the Authentication Tester (per
[zap-helper][zap-helper], under `Tools > Authentication Tester` or
`Ctrl+T`), export the Context:

`File > Export Context > save as context.xml`

Commit `context.xml` to the repo at `.zap/context.xml`. The file encodes
auth method, session management strategy, verification strategy, and
include/exclude URL patterns. It does NOT contain user credentials when
users are configured with the `-config` override pattern above.

Use in CI:

```bash
docker run --rm \
  -e ZAP_AUTH_USERNAME=$ZAP_USER \
  -e ZAP_AUTH_PASSWORD=$ZAP_PASS \
  -v $(pwd):/zap/wrk/:rw \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://app.example.com -n /zap/wrk/.zap/context.xml -J report.json
```

Per [zap-baseline][zap-baseline-skill], the `-n CONTEXT_FILE` flag loads
this file and activates authentication for the scan.

[zap-baseline-skill]: ../zap-baseline/SKILL.md

## Step 12 - Replay with Burp Suite

For apps already configured in ZAP, mirror the session in Burp for manual
testing by capturing a valid authenticated request via ZAP proxy, then:

1. Export the HAR: right-click the authenticated request in ZAP History,
   `Save as HAR`.
2. In Burp, import via `Proxy > HTTP history > Import HAR`.
3. Set up a **Macro** (`Project > Session handling rules > Macros`) that
   replays the login POST and extracts the session token using a regex
   matching the cookie or JSON `access_token` field.
4. Add a **Session handling rule** (`Settings > Sessions > Session handling
   rules > Add`) with scope covering the entire app and the macro set as the
   rule action.

This keeps Burp and ZAP scanning the same authenticated surface without
re-configuring login from scratch in each tool.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip context creation, use `-u user:pass` flag | No re-auth; spider logs out mid-scan | Context + auth method (Steps 1-3) |
| Hardcode credentials in context.xml | Secrets leak in version control | `-config` injection or env vars (Step 10) |
| No logged-out indicator | ZAP reports false coverage on expired sessions | Calibrate both indicators (Step 9) |
| Form-based auth on a JSON-API login | ZAP sends form-encoded body; app rejects it | JSON-based auth (Step 4) |
| Exclude `/login` from context scope | Auth POST never proxied; ZAP can't authenticate | Include login URL; exclude only `/logout` (Step 1) |
| Browser-based auth without auth-helper addon | `method: browser` is not a built-in; scan fails | Install Authentication Helper from Marketplace (Step 6) |
| Set verification strategy but no indicators | Strategy is inactive; ZAP never detects re-auth need | Supply at least one logged-in regex (Step 9) |

## Limitations

- ZAP auth context cannot be built or tested without the ZAP desktop or
  automation framework; no pure-CLI context creation exists.
- MFA (TOTP, SMS OTP) requires Script-Based auth with a TOTP library or a
  pre-generated token injected via env var; ZAP has no native MFA support.
- Browser-Based auth requires a local browser and is not available in
  headless Docker without a virtual display or the auth-helper's
  browser-in-Docker mode.
- Per [zap-methods][zap-methods], Manual Authentication "does not support
  re-authentication in case the webapp logs a user out"; avoid for active
  scans longer than the session TTL.
- Context XML export includes URL patterns but not user credentials when
  using the `-config` flag injection pattern; anyone needing credentials
  must supply them separately.

## References

- [zaproxy.org/docs/desktop/start/features/authentication/][zap-auth] - authentication overview
- [zaproxy.org/docs/desktop/start/features/authmethods/][zap-methods] - per-method config
- [zaproxy.org/docs/desktop/start/features/sessionmanagement/][zap-session] - session management
- [zaproxy.org/docs/desktop/start/features/authstrategies/][zap-verify] - verification strategies
- [zaproxy.org/docs/desktop/start/features/users/][zap-users] - user configuration
- [zaproxy.org/docs/desktop/addons/authentication-helper/][zap-helper] - browser-based auth + auth tester
- [`zap-baseline`](../zap-baseline/SKILL.md) - baseline scan using the context file produced here
- [`dast-scan-cadence-author`](../dast-scan-cadence-author/SKILL.md) - layered DAST cadence (baseline, full, Burp deep)
