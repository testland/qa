# stride-threat-modeling - ASVS anchors and worked example

The mitigation-anchor table and the end-to-end worked example, moved out of
the SKILL.md spine. The STRIDE categories, the inventory and STRIDE-question
steps, the scoring rule, and the output format live in [SKILL.md](../SKILL.md).

## ASVS mitigation anchors

Every threat row needs a mitigation specific to its asset plus the OWASP ASVS
verification requirement it maps to, so a reviewer can check it later.
Requirement IDs are ASVS 4.0.3.

| Threat shape | ASVS anchor (4.0.3) |
|---|---|
| Session token theft or replay | V3 Session Management, section V3.5 Token-based Session Management ([asvs-v3][asvs-v3]) |
| Missing or bypassable authorization check | V4.1.1 "enforces access control rules on a trusted service layer"; V4.1.5 access controls "fail securely including when an exception occurs" ([asvs-v4][asvs-v4]) |
| Authorization attributes trusted from the client (IDOR) | V4.1.2 "all user and data attributes and policy information used by access controls cannot be manipulated by end users" ([asvs-v4][asvs-v4]) |
| Verbose errors leaking internals | V7.4.1 generic message on unexpected or security-sensitive errors, "potentially with a unique ID which support personnel can use to investigate" ([asvs-v7][asvs-v7]) |
| Storage exhaustion via uploads | V12.1.1 application "will not accept large files that could fill up storage or cause a denial of service"; V12.1.3 "a file size quota and maximum number of files per user is enforced" ([asvs-v12][asvs-v12]) |
| Decompression bomb | V12.1.2 compressed files checked "against maximum allowed uncompressed size and against maximum number of files before uncompressing" ([asvs-v12][asvs-v12]) |
| Content-type confusion / polyglot file | V12.2.1 files from untrusted sources "validated to be of expected type based on the file's content" ([asvs-v12][asvs-v12]) |
| Uploaded file served from an executable path | V12.4.1 untrusted files kept outside the web root with restricted permissions ([asvs-v12][asvs-v12]) |

[asvs-v3]: https://raw.githubusercontent.com/OWASP/ASVS/v4.0.3/4.0/en/0x12-V3-Session-management.md
[asvs-v4]: https://raw.githubusercontent.com/OWASP/ASVS/v4.0.3/4.0/en/0x12-V4-Access-Control.md
[asvs-v7]: https://raw.githubusercontent.com/OWASP/ASVS/v4.0.3/4.0/en/0x15-V7-Error-Logging.md
[asvs-v12]: https://raw.githubusercontent.com/OWASP/ASVS/v4.0.3/4.0/en/0x20-V12-Files-Resources.md

## Worked example

Input spec:

> "Users can upload a profile photo. We accept JPEG and PNG up to 5MB. Photos
> are stored in an object store and served via CDN."

Step 1 inventory: interactor = authenticated user; process = upload handler and
image processor; data store = object bucket; data flows = browser to handler,
handler to bucket, CDN to public internet; trust boundary = browser to server,
and private bucket to public CDN.

Step 2 and 3 output:

| ID | STRIDE | Asset | Threat | L | I | Score | Mitigation |
|---|---|---|---|---|---|---|---|
| T-T1 | Tampering | Image processor | Decompression bomb exhausts worker memory | 2 | 3 | 6 | Check uncompressed size and file count before decompressing; per-request resource limits; dimension caps. ASVS 4.0.3 V12.1.2 ([asvs-v12][asvs-v12]). |
| T-T2 | Tampering | Served object | Polyglot file (valid image plus script) executed from the serving origin | 2 | 3 | 6 | Validate type from file content, not extension; serve from a separate cookie-less origin; `Content-Disposition: attachment` for anything not a known image type; keep uploads outside the web root. ASVS 4.0.3 V12.2.1, V12.4.1 ([asvs-v12][asvs-v12]). |
| T-I1 | Info disclosure | Object bucket | Predictable object URLs let an attacker enumerate other users' uploads | 2 | 2 | 4 | Opaque UUID keys; signed URLs with short expiry; authorize on the service layer rather than by URL secrecy. ASVS 4.0.3 V4.1.1 ([asvs-v4][asvs-v4]). |
| T-D1 | Denial of service | Object bucket | Mass uploads exhaust the storage budget | 2 | 2 | 4 | Per-user file-count and size quota; org-level cost alerting. ASVS 4.0.3 V12.1.1, V12.1.3 ([asvs-v12][asvs-v12]). |

No spoofing, repudiation, or elevation-of-privilege rows: the upload is
authenticated by the existing session and grants no new capability, so those
intersections were filtered in Step 3 rather than padded.

Contrast with a read-only `/profile` spec on the same system. Only two rows
survive: session replay (S, against the interactor) and an insecure direct
object reference (I, against the profile record: authorize by the session's
user ID, never by a path parameter, per V4.1.2 ([asvs-v4][asvs-v4])). Small,
but real. For a static text edit on a public marketing page, the inventory
turns up no security-relevant assets and the honest output is exactly that.
