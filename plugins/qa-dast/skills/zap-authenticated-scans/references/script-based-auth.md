# ZAP Script-Based Authentication

Per [zap-methods], Script-Based auth handles flows that Form-Based and
JSON-Based cannot: OTP-augmented logins, multi-step forms, OAuth
authorization-code flows with PKCE, or apps that rotate CSRF seeds on every
page load.

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
`access_token` in a ZAP environment variable for header injection (see
[references/oauth-bearer-injection.md](oauth-bearer-injection.md)).

[zap-methods]: https://www.zaproxy.org/docs/desktop/start/features/authmethods/
