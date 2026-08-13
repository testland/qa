# ZAP Authentication Verification Strategy

Per [zap-verify], ZAP uses an **Authentication Verification Strategy** to know
whether a request is executing as an authenticated user. Configure in
`Session Properties > Context > Authentication > Verification`:

**Logged-In Indicator**: a regex present in responses when the user is
authenticated. Examples:

- `\QWelcome, \E` (welcome banner with the username)
- `\Qhref="/logout"\E` (logout link in nav)
- `\Q"role":"user"\E` (JSON response field)

**Logged-Out Indicator**: a regex present in responses when the session has
expired. Examples:

- `\QPlease log in\E`
- `\Qlocation: /login\E` (redirect header)
- `HTTP/1\.1 401`

Per [zap-verify], four strategies are available:

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
