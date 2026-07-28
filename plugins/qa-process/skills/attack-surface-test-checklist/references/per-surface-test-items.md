# Per-surface test items

Deep reference for the `attack-surface-test-checklist` SKILL.md, Step 4. The Authentication surface is kept inline in SKILL.md as the worked example of the item shape; this file carries the other eight surfaces. Pull only the sections whose surface is active, and rewrite each item with the specific files, parameters, and endpoints recorded in Step 1.

## Session management

Manual:

- Check every cookie the change sets or modifies for the `Secure` attribute (ASVS 4.0.3 3.4.1), the `HttpOnly` attribute (3.4.2), and a `SameSite` attribute limiting cross-site request forgery exposure (3.4.3) ([V3](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x12-V3-Session-management.md)). Pair with WSTG 4.6.2 Testing for Cookies Attributes ([WSTG 4.6](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/06-Session_Management_Testing/README)).
- Log out through the changed flow, then replay the old token: logout and expiration must invalidate the session token such that the back button or a downstream relying party cannot resume the session (3.3.1). Pair with WSTG 4.6.6 Testing for Logout Functionality.
- Capture the pre-authentication token and re-check it after login: the application must generate a new session token on user authentication (3.2.1). Pair with WSTG 4.6.3 Testing for Session Fixation.
- If token generation changed, confirm tokens still carry at least 64 bits of entropy (3.2.2) and are generated with approved cryptographic algorithms (3.2.4).

Automated:

- Assert on `Set-Cookie` response headers for the changed endpoints in an integration test, so the attributes cannot silently regress.

## Input handling

Manual:

- Drive every new or modified parameter with SQL metacharacters. Data selection and queries must use parameterized queries, ORMs, or entity frameworks (ASVS 4.0.3 5.3.4) ([V5](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x13-V5-Validation-Sanitization-Encoding.md)). Pair with WSTG 4.7.5 Testing for SQL Injection ([WSTG 4.7](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/README)).
- Drive the same parameters with XSS payloads and check that context-aware output escaping protects against reflected, stored, and DOM based XSS (5.3.3). Pair with WSTG 4.7.1 and 4.7.2.
- If the change renders a server-side template with user input, probe for template injection: user input must be sanitized or sandboxed (5.2.5). Pair with WSTG 4.7.18 Testing for Server-side Template Injection.
- If an XML parser is touched, confirm it uses the most restrictive configuration available and that resolving external entities is disabled (5.5.2). Pair with WSTG 4.7.7 Testing for XML Injection.
- Confirm new inputs are validated with positive validation (allow lists) (5.1.3) and that structured data is strongly typed and validated against a defined schema covering allowed characters, length, and pattern (5.1.4).
- If the change binds request data onto a model, confirm protection against mass parameter assignment such as marking fields private (5.1.2).

Automated:

- Run injection-family static analysis rules scoped to the changed route, controller, and query-building files.
- Add negative-path tests for the rejected inputs so the validation itself has regression coverage.

## File upload

Manual:

- Upload a file whose extension and content disagree. Files obtained from untrusted sources must be validated to be of the expected type based on the file's content, not the extension (ASVS 4.0.3 12.2.1) ([V12](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x20-V12-Files-Resources.md)). Pair with WSTG 4.10.8 Test Upload of Unexpected File Types ([WSTG 4.10](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/10-Business_Logic_Testing/README)).
- Confirm the destination: untrusted files must be stored outside the web root with limited permissions (12.4.1), and scanned by antivirus scanners (12.4.2).
- Send traversal sequences and absolute paths in the filename. User-submitted filename metadata must not be used directly by system or framework filesystems (12.3.1), and must be validated or ignored to prevent disclosure, creation, updating, or removal of local files (12.3.2). Pair with WSTG 4.10.9 Test Upload of Malicious Files.
- Push size and compression limits: the application must not accept large files that could fill storage or cause denial of service (12.1.1), and compressed files must be checked against a maximum uncompressed size and a maximum number of files (12.1.2).
- If the feature fetches a file from a user-supplied URL, confirm the server is configured with an allow list of resources or systems it may send requests to (12.6.1). SSRF flaws occur whenever an application fetches a remote resource without validating the user-supplied URL ([A10:2021](https://owasp.org/Top10/2021/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)).

Automated:

- Add a fixture upload of a polyglot file (a valid image with an embedded script payload) through the changed endpoint and assert it is rejected.

## Deserialization

Manual:

- Confirm the changed path avoids deserializing untrusted data, or protects it, in both custom code and third-party JSON, XML, and YAML parsers (ASVS 4.0.3 5.5.3) ([V5](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x13-V5-Validation-Sanitization-Encoding.md)).
- If serialized objects cross a trust boundary, confirm they use integrity checks or are encrypted to prevent hostile object creation or data tampering (5.5.1). The Top 10 2021 scenario for this category is exactly that shape: a serialized user state passed back and forth per request, re-signed by an attacker into remote code execution ([A08:2021](https://owasp.org/Top10/2021/A08_2021-Software_and_Data_Integrity_Failures/)).
- In browser or JavaScript-based backends, confirm `JSON.parse` is used and `eval()` is not (5.5.4).

Automated:

- Add static-analysis rules scoped to the changed files that flag `pickle.loads`, `yaml.load` without `safe_load`, and Java `ObjectInputStream`.

## Access control

Manual:

- Authenticate as user A, then request user B's resources through every changed endpoint. Sensitive data and APIs must be protected against Insecure Direct Object Reference attacks targeting creation, reading, updating, and deletion of records (ASVS 4.0.3 4.2.1) ([V4](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x12-V4-Access-Control.md)). Pair with WSTG 4.5.4 Testing for Insecure Direct Object References ([WSTG 4.5](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/05-Authorization_Testing/README)).
- Call the changed privileged operations as a lower-privileged role: least privilege requires that users only access functions, data files, URLs, controllers, services, and other resources for which they hold specific authorization (4.1.3). Pair with WSTG 4.5.3 Testing for Privilege Escalation.
- Manipulate role, tenant, and ownership parameters in the request. Attributes and policy information used by access controls must not be manipulable by end users unless specifically authorized (4.1.2). Pair with WSTG 4.5.2 Testing for Bypassing Authorization Schema.
- Confirm the check runs server-side: access control rules must be enforced on a trusted service layer, especially where a client-side check exists and could be bypassed (4.1.1).
- Force an exception inside the changed guard and confirm access controls fail securely (4.1.5).
- If the change adds an administrative interface, confirm it uses appropriate multi-factor authentication (4.3.1).

Automated:

- Add a static-analysis or route-inventory rule that flags changed handlers lacking an authorization guard, decorator, or policy attachment.

## API and web service

Manual:

- Replay each changed endpoint with unexpected HTTP verbs. Enabled RESTful HTTP methods must be a valid choice for the user or action (ASVS 4.0.3 13.2.1) ([V13](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x21-V13-API.md)). Pair with WSTG 4.7.3 Testing for HTTP Verb Tampering ([WSTG 4.7](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/README)).
- Send a wrong and a missing `Content-Type`. REST services must explicitly check the incoming content type is the expected one (13.2.5), and requests with unexpected or missing content types must be rejected with appropriate headers (13.1.5).
- Confirm JSON schema validation is in place and verified before input is accepted (13.2.2).
- Probe every changed endpoint unauthenticated: authorization decisions must be made at the URI, enforced programmatically or declaratively (13.1.4).
- Inspect changed API URLs for sensitive values. URLs must not expose information such as API keys or session tokens (13.1.3).
- For a changed GraphQL schema or resolver, send deeply nested and batched queries: a query allow list, or depth limiting and amount limiting, must prevent GraphQL denial of service (13.4.1). Confirm authorization logic sits in the business logic layer rather than the GraphQL layer (13.4.2). Pair with WSTG 4.12.1 Testing GraphQL ([WSTG 4.12](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/12-API_Testing/README)).

Automated:

- Diff the API schema or route inventory between base and head, and fail the check when a new endpoint or field appears without a declared auth requirement.

## Cryptography

Manual:

- Read the changed algorithm selection. Known insecure block modes such as ECB, padding modes such as PKCS#1 v1.5, ciphers with small block sizes such as Triple-DES and Blowfish, and weak hashing algorithms such as MD5 and SHA1 must not be used unless required for backwards compatibility (ASVS 4.0.3 6.2.5) ([V6](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x14-V6-Cryptography.md)). The Top 10 2021 guidance is the same: avoid deprecated cryptographic functions and padding schemes such as MD5, SHA1, and PKCS number 1 v1.5 ([A02:2021](https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/)).
- Inspect IV and nonce handling: nonces, initialization vectors, and other single use numbers must not be used more than once with a given encryption key, and the generation method must suit the algorithm (6.2.6).
- Confirm any new random value used for security purposes comes from the cryptographic module's approved cryptographically secure random number generator (6.3.1), and that new GUIDs use the v4 algorithm with a CSPRNG (6.3.2).
- Confirm new keys and secrets live in a secrets management solution such as a key vault (6.4.1) rather than in source or config, and that key material is not exposed to the application where an isolated module can perform the operation (6.4.2).
- Check transport on changed paths: all data in transit should be encrypted with secure protocols such as TLS with forward secrecy ciphers ([A02:2021](https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/)). Pair with WSTG 4.9.1 Testing for Weak Transport Layer Security and 4.9.4 Testing for Weak Encryption ([WSTG 4.9](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/README)).

Automated:

- Static-analysis rules scoped to the changed files that flag hard-coded key and IV literals and any use of MD5, SHA1, DES, or ECB mode.
- Static-analysis rule that flags non-cryptographic randomness such as `Math.random()` in a security context.

## Data protection

Manual:

- Review changed model, schema, and serializer fields for sensitive values. Sensitive or private information that is required to be encrypted must use approved algorithms providing both confidentiality and integrity (ASVS 4.0.3 8.3.7) ([V8](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x16-V8-Data-Protection.md)).
- Read every log statement the change adds. The application must not log credentials or payment details, and session tokens should only appear in logs in an irreversible hashed form (7.1.1); other sensitive data defined under local privacy laws or security policy must not be logged either (7.1.2) ([V7](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x15-V7-Error-Logging.md)).
- Check changed caching behavior: sensitive data must be protected from being cached in server components such as load balancers and application caches (8.1.1), and cached or temporary server-side copies must be purged or invalidated after the authorized user accesses the data (8.1.2). On the client side, confirm sufficient anti-caching headers are set (8.2.1).
- If the change writes to browser storage, confirm `localStorage`, `sessionStorage`, `IndexedDB`, and cookies do not hold sensitive data (8.2.2).
- Check changed request shapes: sensitive data must travel in the HTTP message body or headers, and query string parameters of any HTTP verb must not carry it (8.3.1).
- For changed endpoints returning personal data, minimize the response. The application should minimize the number of parameters in a request, including hidden fields, Ajax variables, cookies, and header values (8.1.3), and the same discipline applies to what is sent back.
- Pair transport checks with WSTG 4.9.3 Testing for Sensitive Information Sent via Unencrypted Channels ([WSTG 4.9](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/README)).

Automated:

- Static-analysis rule that flags log statements in the changed files which interpolate model fields without a redaction or masking helper.
- Static-analysis rule that flags changed serializers exposing sensitive fields without an explicit exclusion.
