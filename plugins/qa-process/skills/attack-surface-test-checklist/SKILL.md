---
name: attack-surface-test-checklist
description: "Maps a code change to the security tests worth running against it. Classifies changed paths and file contents into nine attack surfaces (authentication, session management, input handling, file upload, deserialization, access control, API and web service, cryptography, data protection), attaches the matching OWASP ASVS 4.0.3 verification requirements, OWASP Top 10 2021 category IDs, and OWASP WSTG section numbers to each active surface, then emits a per-surface manual and automated test checklist bounded by what actually changed. Surfaces with no changed lines are excluded rather than carried as filler. Use when a pull request, release branch, or feature is about to be security tested and the team needs a targeted test list instead of a generic application-wide checklist."
---

# attack-surface-test-checklist

## Overview

A change set has an attack surface: the set of security-relevant behaviors its files participate
in. A migration adding an `avatar_url` column and one adding a `password_reset_token` column
look identical in a diff stat and need entirely different tests. This skill turns a change set
into a bounded security test checklist in four moves:

1. Classify each changed file into one or more of nine attack surfaces.
2. Attach the OWASP ASVS verification requirements for each active surface.
3. Tag each active surface with its OWASP Top 10 2021 category and WSTG test sections.
4. Emit the per-surface manual and automated test items, and list the excluded surfaces.

## Differentiation axis

**What this owns:** the mapping from a specific change to the specific security tests worth
running against it, expressed as checkable items with standards references.

**What it deliberately is not:**

- **Not a scanner configuration.** The automated items are specifications of what to run, not tool settings. Triaging findings a scanner already produced is a different job.
- **Not a penetration-test methodology.** WSTG describes a full assessment of a deployed target; this selects a small subset because a change touched a surface, and stops when that surface is covered.
- **Not a compliance-control audit.** ASVS chapters are a catalog of things worth testing, not controls to attest against. A completed checklist is evidence tests ran, never evidence the change is secure or that any ASVS level is met.

## Which ASVS version this uses

**All requirement IDs below use OWASP ASVS 4.0.3 numbering.** ASVS renumbers requirements
between major versions, so an ID with no version attached is ambiguous. ASVS 5.0.0 was released
on 2025-05-30 and 4.0.3 remains published as the previous stable release ([OWASP ASVS project page](https://owasp.org/www-project-application-security-verification-standard/)). On a
project standardized on 5.0.0, treat the chapter names below as the lookup key and re-resolve
the numbers against that edition; the surfaces and test items do not change.

ASVS defines three verification levels: Level 1 is a low assurance level that is completely
penetration testable, Level 2 is for applications containing sensitive data and is the
recommended level for most applications, and Level 3 is for the most critical applications such
as those handling high value transactions or sensitive medical data ([ASVS 4.0.3, Using the ASVS](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x03-Using-ASVS.md)). For a per-change
checklist, default to Level 1 items and escalate to Level 2 when the change touches credential
storage or session token issuance. That default is a scoping convention of this skill, not an
ASVS rule.

## The nine attack surfaces

Classify each changed file by path first, then confirm or correct with content. A file can
belong to more than one surface.

| Surface | Path signals | Content signals |
|---|---|---|
| Authentication | `auth/`, `login/`, `oauth/`, `sso/`, `mfa/`, `token/` | Password hashing, session creation, JWT issuance, credential validation |
| Session management | `session/`, `cookie`, `middleware/` | Cookie attribute setting, token expiry, invalidation on logout |
| Input handling | `routes/`, `controllers/`, `validators/`, `forms/`, `parsers/` | SQL queries, template rendering, shell invocation, XML or JSON parsing |
| File upload | `upload/`, `storage/`, `media/`, `attachments/` | Multipart handling, MIME validation, storage path construction |
| Deserialization | `serializ`, `marshal`, `pickle`, `yaml.load`, `JSON.parse` | Object hydration from an untrusted source |
| Access control | `permissions/`, `policy/`, `roles/`, `authz/`, `acl/` | Role checks, ownership assertions, resource-level guards |
| API and web service | `api/`, `graphql/`, `soap/`, `rest/` | Schema validation, HTTP method checks, rate limiting |
| Cryptography | `crypto/`, `cipher`, `hmac`, `hash`, `tls/` | Key generation, algorithm selection, IV or nonce handling |
| Data protection | `pii/`, `gdpr/`, `models/`, `db/`, `cache/` | Sensitive fields stored in plaintext, logging of secrets, caching policy |

Two rules keep the classification honest:

1. **Path first, content second.** The path signal decides unless file content contradicts it. A
   file under `utils/` that calls `yaml.load` is a deserialization surface; a file under
   `crypto/` that only re-exports constants is not a cryptography surface.
2. **A surface with zero changed lines is excluded, not marked "not applicable".** Overscoping
   is the failure mode that kills these checklists: when every change produces the same forty
   items, the list stops being read.

## Step 1 - Mark the active surfaces

For each changed file, record the surface or surfaces it matched and the count of changed lines
attributed to each. A surface is **active** when at least one changed line lands in it. Keep the
file list per surface: it is what makes the test items concrete later ("SQL injection probes on
the two new query parameters in `orders_controller`", not "test for SQL injection"). Record the
excluded surfaces explicitly too. A reader needs to see that file upload was considered and
found untouched, otherwise they cannot tell whether it was skipped or forgotten.

## Step 2 - Attach ASVS requirements

| Surface | ASVS 4.0.3 chapter | Requirement areas to pull items from |
|---|---|---|
| Authentication | V2 Authentication | V2.2 General Authenticator Security, V2.4 Credential Storage, V2.5 Credential Recovery ([V2](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x11-V2-Authentication.md)) |
| Session management | V3 Session Management | V3.2 Session Binding, V3.3 Session Termination, V3.4 Cookie-based Session Management ([V3](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x12-V3-Session-management.md)) |
| Input handling | V5 Validation, Sanitization and Encoding | V5.1 Input Validation, V5.2 Sanitization and Sandboxing, V5.3 Output Encoding and Injection Prevention ([V5](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x13-V5-Validation-Sanitization-Encoding.md)) |
| File upload | V12 Files and Resources | V12.1 File Upload, V12.2 File Integrity, V12.3 File Execution, V12.4 File Storage, V12.6 SSRF Protection ([V12](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x20-V12-Files-Resources.md)) |
| Deserialization | V5 Validation, Sanitization and Encoding | V5.5 Deserialization Prevention ([V5](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x13-V5-Validation-Sanitization-Encoding.md)) |
| Access control | V4 Access Control | V4.1 General Access Control Design, V4.2 Operation Level Access Control, V4.3 Other Access Control Considerations ([V4](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x12-V4-Access-Control.md)) |
| API and web service | V13 API and Web Service | V13.1 Generic Web Service Security, V13.2 RESTful Web Service, V13.4 GraphQL ([V13](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x21-V13-API.md)) |
| Cryptography | V6 Stored Cryptography | V6.2 Algorithms, V6.3 Random Values, V6.4 Secret Management ([V6](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x14-V6-Cryptography.md)) |
| Data protection | V8 Data Protection, plus V7 Error Handling and Logging | V8.1 General Data Protection, V8.2 Client-side Data Protection, V8.3 Sensitive Private Data ([V8](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x16-V8-Data-Protection.md)); V7.1 Log Content ([V7](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x15-V7-Error-Logging.md)) |

Data protection spans two chapters on purpose. Secrets leaking into logs is a logging
requirement (V7.1), not a data protection one, and a checklist that only reads V8 misses it.

## Step 3 - Tag Top 10 2021 categories and WSTG sections

| Surface | OWASP Top 10 2021 | WSTG section |
|---|---|---|
| Authentication | [A07:2021 Identification and Authentication Failures](https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/) | [4.4 Authentication Testing](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/04-Authentication_Testing/README) |
| Session management | [A07:2021](https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/) | [4.6 Session Management Testing](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/06-Session_Management_Testing/README) |
| Input handling | [A03:2021 Injection](https://owasp.org/Top10/2021/A03_2021-Injection/) | [4.7 Input Validation Testing](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/README) |
| File upload | [A04:2021 Insecure Design](https://owasp.org/Top10/2021/A04_2021-Insecure_Design/), [A10:2021 SSRF](https://owasp.org/Top10/2021/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/) | [4.10 Business Logic Testing](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/10-Business_Logic_Testing/README) (4.10.8, 4.10.9) |
| Deserialization | [A08:2021 Software and Data Integrity Failures](https://owasp.org/Top10/2021/A08_2021-Software_and_Data_Integrity_Failures/) | [4.7 Input Validation Testing](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/README) (4.7.11 Code Injection) |
| Access control | [A01:2021 Broken Access Control](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/) | [4.5 Authorization Testing](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/05-Authorization_Testing/README) |
| API and web service | [A01:2021](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/), [A03:2021](https://owasp.org/Top10/2021/A03_2021-Injection/) | [4.12 API Testing](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/12-API_Testing/README) (4.12.1 Testing GraphQL) |
| Cryptography | [A02:2021 Cryptographic Failures](https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/) | [4.9 Testing for Weak Cryptography](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/README) |
| Data protection | [A02:2021](https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/), [A05:2021 Security Misconfiguration](https://owasp.org/Top10/2021/A05_2021-Security_Misconfiguration/) | [4.2 Configuration and Deployment Management Testing](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/README) |

Three tagging notes that catch people out:

- **XSS is inside A03:2021 Injection.** The 2021 category maps 33 CWEs including CWE-79
  Cross-site Scripting, CWE-89 SQL Injection, and CWE-78 OS Command Injection ([A03:2021](https://owasp.org/Top10/2021/A03_2021-Injection/)). Do not
  file XSS under a separate category.
- **XXE is inside A05:2021 Security Misconfiguration.** Its notable CWEs include CWE-611
  Improper Restriction of XML External Entity Reference ([A05:2021](https://owasp.org/Top10/2021/A05_2021-Security_Misconfiguration/)), even though the test that
  finds it lives in WSTG 4.7 Input Validation.
- **`WSTG-<CAT>-<NN>` shorthand IDs are not printed on the stable index pages.** The section
  numbers used here (4.4.3, 4.5.4, and so on) are what the stable guide publishes, so they are
  the citable form.

## Step 4 - Per-surface test items

Pull only the sections whose surface is active. Rewrite each item with the specific files,
parameters, and endpoints recorded in Step 1.

### Authentication

Manual:

- Inspect changed credential storage: passwords must be salted and hashed with an approved
  one-way key derivation or password hashing function (ASVS 4.0.3 2.4.1). If PBKDF2 is used, the
  iteration count should be as large as verification server performance allows, typically at
  least 100,000 iterations (2.4.3). If bcrypt is used, the work factor should be as large as
  performance allows, with a minimum of 10 (2.4.4) ([V2](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x11-V2-Authentication.md)).
- Confirm changed login endpoints keep anti-automation controls effective against breached
  credential testing, brute force, and account lockout attacks; ASVS states no more than 100
  failed attempts per hour should be possible on a single account (2.2.1). Pair with WSTG 4.4.3
  Testing for Weak Lock Out Mechanism ([WSTG 4.4](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/04-Authentication_Testing/README)).
- If the change adds an alternative sign-in path, confirm weak authenticators such as SMS and
  email are limited to secondary verification and transaction approval rather than replacing a
  stronger method (2.2.2). Pair with WSTG 4.4.10 Testing for Weaker Authentication in
  Alternative Channel.
- Exercise any changed recovery path: a system generated activation or recovery secret must not
  be sent in clear text (2.5.1), knowledge-based "secret questions" must not be present (2.5.2),
  and recovery must not reveal the current password (2.5.3). Pair with WSTG 4.4.9 Testing for
  Weak Password Change or Reset Functionalities.

Automated:

- Run static-analysis rules for plaintext or reversibly-stored credentials against the changed
  files only.
- Scan the changed lines for hard-coded credentials and API keys.

The remaining eight surfaces (session management, input handling, file upload,
deserialization, access control, API and web service, cryptography, data protection) follow the
same Manual / Automated shape with their own ASVS 4.0.3, Top 10 2021, and WSTG citations. Pull
the full catalog from [references/per-surface-test-items.md](references/per-surface-test-items.md).

## Output format

Emit one Markdown block containing, in order:

1. **Header** naming the change set (repository, branch or pull request identifier, and the
   commit the plan was built from) and the date.
2. **Surfaces touched**, with the changed-line count per surface.
3. **ASVS target level** and one sentence saying why that level was chosen.
4. **Test items by surface**, as checkboxes tagged `[MANUAL]` or `[AUTO]`, each carrying its
   ASVS 4.0.3 requirement ID and, where one applies, its WSTG section number. Name the actual
   files, parameters, or endpoints.
5. **Surfaces excluded**, listed by name, so a reader can see what was considered and found
   untouched.
6. **Findings already visible in the change**, if any: something spotted while classifying that
   is a defect now, not a test to run later.
7. **Not established by this checklist**: an explicit line stating that completing the items is
   evidence tests ran, not evidence the change is secure, and not an ASVS level attestation.

Keep item 7 even when it feels redundant. It is what stops a green checklist from being read as
a sign-off.

## Worked example

Change set: a pull request on a document management service adding shared-link downloads.
Changed files:

```
src/api/routes/share_links.py          +142
src/services/share_link_service.py     +96
src/storage/attachment_fetcher.py      +54
src/models/share_link.py               +31
migrations/0042_share_link.sql         +18
tests/api/test_share_links.py          +210
```

Classification: `api/routes/` and the new query parameters make **input handling** and **API and
web service** active. `storage/` plus a fetch by URL makes **file upload** active (its SSRF
sub-area specifically). The model and migration add a token column, making **data protection**
active. `share_link` tokens are generated in the service, making **cryptography** active. The
link grants object access without a session, making **access control** active. No login, cookie,
or deserialization code changed. Test files are excluded from classification.

```markdown
## Security test plan - docs-service PR #814 - 3f9a1c2

**Surfaces touched:** input handling (142), API and web service (142),
access control (96), file upload / SSRF (54), data protection (49),
cryptography (96)
**ASVS target level:** L2 (the change issues a bearer-style access token)
**Produced:** 2026-07-19

### Input handling
- [ ] [MANUAL] SQL metacharacters on `?token=` and `?expires=` in `share_links.py`; confirm parameterized queries (ASVS 4.0.3 5.3.4; WSTG 4.7.5)
- [ ] [MANUAL] Positive allow-list validation on both new parameters (ASVS 4.0.3 5.1.3)
- [ ] [AUTO]   Injection static-analysis rules scoped to `src/api/routes/`

### API and web service
- [ ] [MANUAL] Verb tampering on `/share/{id}`: PUT, DELETE, PATCH (ASVS 4.0.3 13.2.1; WSTG 4.7.3)
- [ ] [MANUAL] Wrong and missing `Content-Type` rejected (ASVS 4.0.3 13.2.5, 13.1.5)
- [ ] [MANUAL] `token` is not exposed in the URL path or logs (ASVS 4.0.3 13.1.3)

### Access control
- [ ] [MANUAL] Fetch another tenant's document id with a valid token (ASVS 4.0.3 4.2.1; WSTG 4.5.4)
- [ ] [MANUAL] Force an exception in the token guard; confirm deny (ASVS 4.0.3 4.1.5)

### File upload / SSRF
- [ ] [MANUAL] `attachment_fetcher.py` remote fetch against 169.254.169.254 and file:// ; confirm allow list (ASVS 4.0.3 12.6.1; A10:2021)

### Cryptography
- [ ] [MANUAL] Token generated via CSPRNG, not `random` (ASVS 4.0.3 6.3.1)
- [ ] [AUTO]   Flag `Math.random` / `random.random` in `share_link_service.py`

### Data protection
- [ ] [MANUAL] Token column encrypted or stored hashed (ASVS 4.0.3 8.3.7)
- [ ] [MANUAL] No token value in the new log lines (ASVS 4.0.3 7.1.1)

### Surfaces excluded (no changed lines)
Authentication, session management, deserialization

### Findings already visible in the change
- `share_link_service.py:41` builds the token with `random.randint`. This is a defect now, not a test item. Route it to defect triage.

### Not established by this checklist
Completing these items is evidence that the listed tests ran against this change. It is not a statement that the change is secure, and it is not an ASVS L2 attestation.
```

## Anti-patterns

| Anti-pattern | Why it fails | Correct behavior |
|---|---|---|
| Applying the generic Top 10 list unchanged | Every change gets the same forty items and the team stops reading them | Filter to active surfaces in Step 1 and list the excluded ones explicitly |
| Expanding to a full application assessment | The checklist balloons past what anyone will execute, so nothing gets tested | Bound the plan by the changed surface. A file upload change does not trigger a full authentication review |
| Building the checklist from scanner output | That is triage of findings that already exist, a different input and a different decision | Build this before scanners run; feed findings to defect triage instead |
| Inventing ASVS requirement numbers | Fabricated IDs misroute the tester and destroy trust in every other ID on the page | Cite only IDs read from the published chapter; when unsure, name the chapter and section instead |
| Quoting requirement IDs without a version | ASVS renumbers across major versions, so a bare `V2.4` is ambiguous | Write the version next to the ID, as in ASVS 4.0.3 2.4.3 |
| Marking an item PASS with no evidence | Produces false confidence that survives into release | Items are binary: tested with recorded evidence, or not tested |
| Burying an obvious defect as a checklist item | A hard-coded key becomes a task someone might do next sprint | Split it out as a finding in its own section and route it now |
| Treating a complete checklist as a security sign-off | The checklist covers the changed surface only, at one ASVS level | Keep the "not established by this checklist" line in the output |

## Limitations

- **Path classification is a heuristic.** A shared utility in the change set can reach an
  authentication flow that no path signal touched. Content signals reduce this but do not remove
  it; a short human read of the change set is still warranted.
- **The level default is conservative.** The Level 1 default, escalating to Level 2 for
  credential storage or session token issuance (defined in "Which ASVS version this uses"),
  suits most changes; teams in regulated or safety-critical domains should raise it rather than
  accept Level 1.
- **No threat model.** Surfaces map to known categories. Attacker motivation, likelihood, and
  business impact are not modeled, so the checklist cannot rank its own items by risk.
- **No dynamic analysis is performed.** The `[AUTO]` items are specifications of what to run.
  Something else has to run them.
- **Requirement IDs are version-bound.** Every ID here is ASVS 4.0.3. On a project standardized
  on 5.0.0 the chapter names still route correctly but the numbers must be re-resolved against
  that edition ([OWASP ASVS project page](https://owasp.org/www-project-application-security-verification-standard/)).
- **WSTG shorthand IDs are not used.** The stable guide's index pages publish section numbers,
  not `WSTG-<CAT>-<NN>` identifiers, so section numbers are what this skill cites.

## Source index

Every requirement ID, section number, and quoted phrase above carries its source link at the
point it is used. These are the three roots those links come from, for anyone who wants to
browse rather than verify one claim:

- [OWASP ASVS 4.0.3 chapter index](https://github.com/OWASP/ASVS/tree/v4.0.3/4.0/en): chapters V2 through V13, the source of every `ASVS 4.0.3 <n.n.n>` ID here.
- [OWASP Top 10 2021](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/): category pages A01 through A10.
- [OWASP WSTG stable table of contents](https://owasp.org/www-project-web-security-testing-guide/stable/): section 4 test areas 4.1 through 4.12, the source of every `4.x.y` number.
