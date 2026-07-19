---
name: stride-threat-modeling
description: "Enumerates security threats against a feature specification or design using Microsoft's six STRIDE categories (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege), each paired with the security property it violates. Covers the asset-and-trust-boundary walk that produces threat rows, the threat-row output schema, a likelihood x impact triage rule labelled plainly as practitioner convention rather than standard, a worked example, and an anti-pattern catalog. Enumerates threats against a design; it does not scan code, run a penetration test, or audit control compliance. Use when a PRD section, user story, design doc, or architecture sketch touching authentication, user data, payments, file uploads, or an external integration is about to enter implementation and no threat model exists for it yet."
---

# stride-threat-modeling

## What this owns, and what it does not

This skill turns "we are adding feature X" into a table of candidate threats
against the design of X, classified by STRIDE, each with a named mitigation.

The output is a **planning document about a design**, not a finding about a
system. That boundary decides what belongs here:

| Adjacent activity | What it produces | Why it is not this |
|---|---|---|
| Static / dependency / container scanning | Findings about code or artifacts that already exist | Runs against an implementation; this runs before one exists, and every row here is an unproven hypothesis |
| Penetration testing | Demonstrated exploitation with evidence of reachability | Proves a threat is real; this only asserts a threat is plausible and worth designing against |
| Security-control compliance audit | Evidence that a required control is present and effective | Audits go control to system; this goes threat to proposed control, the opposite direction |
| Requirements / testability review | Ambiguity, missing acceptance criteria | Vague wording is a requirements defect, not a security finding. Do not launder it into this table |

If the design already shipped and you want to know whether it is actually
vulnerable, you want a scanner or a tester. This produces the list of things
those tools should later be pointed at.

## The six STRIDE categories

STRIDE is Microsoft's threat classification, "derived from an acronym for the
following six threat categories" ([ms-stride][ms-stride]); the Microsoft
Security Development Lifecycle and its Threat Modeling Tool use the same model
([ms-tmt-threats][ms-tmt-threats]).

[ms-stride]: https://learn.microsoft.com/en-us/previous-versions/commerce-server/ee823878(v=cs.20)
[ms-tmt-threats]: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats

Each letter is the negation of one security property. Microsoft's own mapping
(MSDN Magazine, Figure 3, "Threats and Security Properties") pairs them as
below ([ms-stride-approach][ms-stride-approach]):

[ms-stride-approach]: https://learn.microsoft.com/en-us/archive/msdn-magazine/2006/november/uncover-security-design-flaws-using-the-stride-approach

| Letter | Threat | Property violated | Microsoft's definition of the threat ([ms-stride][ms-stride]) |
|---|---|---|---|
| **S** | Spoofing identity | Authentication | "illegally accessing and then using another user's authentication information, such as username and password" |
| **T** | Tampering with data | Integrity | "the malicious modification of data", including "unauthorized changes made to persistent data" and "the alteration of data as it flows between two computers over an open network" |
| **R** | Repudiation | Non-repudiation | "associated with users who deny performing an action without other parties having any way to prove otherwise" |
| **I** | Information disclosure | Confidentiality | "the exposure of information to individuals who are not supposed to have access to it" |
| **D** | Denial of service | Availability | "attacks deny service to valid users" |
| **E** | Elevation of privilege | Authorization | "an unprivileged user gains privileged access and thereby has sufficient access to compromise or destroy the entire system" |

The property column is not decoration. Microsoft defines each property as
follows, and the definition is what tells you whether a candidate row is really
in that category ([ms-stride-approach][ms-stride-approach], Figure 2):

- **Authentication**: "The identity of users is established (or you're willing to accept anonymous users)."
- **Integrity**: "Data and system resources are only changed in appropriate ways by appropriate people."
- **Non-repudiation**: "Users can't perform an action and later deny performing it."
- **Confidentiality**: "Data is only available to the people intended to access it."
- **Availability**: "Systems are ready when needed and perform acceptably."
- **Authorization**: "Users are explicitly allowed or denied access to resources."

Microsoft is explicit that the classification is not rigorous: the categories
cross-correlate, because "escalation of privilege (E) tends to imply spoofing
and loss of non-repudiation, and could imply tampering, information disclosure,
and denial of service" ([ms-dreadful][ms-dreadful]). Do not spend time arguing
which letter a threat belongs under. Pick the property the attack actually
breaks, record the row, and move on.

[ms-dreadful]: https://learn.microsoft.com/en-us/archive/blogs/david_leblanc/dreadful

## Step 1 - Inventory what the design contains

Walk the spec and tag four things. Microsoft's data-flow-diagram vocabulary
gives the element types ([ms-stride-approach][ms-stride-approach], Figure 4):
data flows, data stores, processes, interactors, plus **trust boundaries**,
which are added specifically for threat modeling.

| Tag | What to look for in the text |
|---|---|
| **Interactors** (actors) | Users, admins, third parties, partner services, the attacker. "the end points of your system: the people, Web services, and servers" |
| **Data stores** | Databases, tables, buckets, queues, caches, files, secrets, credentials, payment data, PII, session tokens |
| **Data flows** | API calls, uploads, downloads, webhooks, integrations, batch/cron transfers |
| **Processes** | Services, workers, jobs, request handlers, the thing that actually computes |
| **Trust boundaries** | browser to server, public to private network, non-admin to admin, tenant to tenant, your code to a vendor's |

Two sanity rules from the same source keep the inventory honest
([ms-stride-approach][ms-stride-approach]):

- **No magic sources or sinks.** "data isn't created out of thin air. Make sure
  you have a user represented as a reader or writer for each data store." A
  store nobody reads means the spec omitted a reader, not that the reader is
  out of scope.
- **No psychokinesis as transport.** "make sure there is always a process that
  reads and writes data. It doesn't go directly from a user's head to the disk."

Record the inventory before you write a single threat. The completeness of the
threat table is bounded by the completeness of this list.

## Step 2 - Ask the STRIDE question per element

For each (element x STRIDE category), ask: *what is the most plausible threat in
this category against this element?* Ask it as a question, not as an assertion,
which is the form Microsoft recommends ("How can an attacker change the
authentication data?", "What is the impact if an attacker can read the user
profile data?", "What happens if access is denied to the user profile
database?") ([ms-stride][ms-stride]).

Not every category applies to every element type. Microsoft's
threats-affecting-elements matrix narrows the grid before you start
([ms-stride-approach][ms-stride-approach], Figure 5):

| Element | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Data flows | | X | | X | X | |
| Data stores | | X | | X | X | |
| Processes | X | X | X | X | X | X |
| Interactors | X | | X | | | |

Model the **asynchronous** surface as well as the synchronous one. Queues, cron
jobs, and batch workers are processes and data flows like any other, and the
matrix above applies to them identically.

## Step 3 - Filter

Drop the intersections where no credible threat exists for *this* design. A
static asset with no service contract has no meaningful denial-of-service row.
A read-only page with no write path has no tampering row. An empty cell is a
result; a fabricated cell is noise that costs a reviewer real time.

If the inventory turns up no security-relevant assets at all (a copy edit on a
public marketing page, for example), the correct output is a statement that no
STRIDE-relevant assets were identified. Padding the table to look thorough is
the single most common way these documents lose their audience.

## Step 4 - Score for triage (practitioner convention, not part of STRIDE)

**STRIDE is a classification scheme and carries no scoring rule.** Nothing in
Microsoft's STRIDE definition ranks or prioritizes threats
([ms-stride][ms-stride]). The rule below is a **practitioner convention** for
getting a triage order out of a threat table. Treat it as a team agreement you
can change, not as a standard you are conforming to.

```
score = likelihood x impact       # each rated 1 (low), 2 (medium), 3 (high)
                                  # possible scores: 1, 2, 3, 4, 6, 9
```

| Score | Convention |
|---|---|
| 6 or 9 | Land the mitigation before ship |
| 3 to 5 | Backlog candidate |
| 1 or 2 | May be accepted, with the rationale written down |

Two things this is **not**:

- **It is not DREAD.** DREAD is a separate Microsoft risk-rating scheme with
  five factors: damage, reliability (reproducibility), exploitability, affected
  users, discoverability. Its co-author has published that the original
  "rate them from 1-10, add them up, and divide by 5" scoring is "an obvious
  malfunction", and that at Microsoft "we're NOT using this internally very
  much. This is NOT how MSRC does things" ([ms-dreadful][ms-dreadful]). Do not
  present the 1-3 rule above as DREAD, and do not import DREAD's factors into
  it.
- **It is not CVSS.** CVSS scores disclosed vulnerabilities in shipped
  software. A design-stage threat has no confirmed vector to score. Coarse
  triage is the right resolution here.

## Step 5 - Attach a specific mitigation

Every row needs a mitigation that is specific to that asset. Name the concrete
control, and cite the verification requirement it maps to so a reviewer can
check it later. OWASP's Application Security Verification Standard is the usual
anchor: it "provides a basis for testing web application technical security
controls and also provides developers with a list of requirements for secure
development" ([owasp-asvs][owasp-asvs]). Requirement IDs below are ASVS 4.0.3.

[owasp-asvs]: https://owasp.org/www-project-application-security-verification-standard/

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

## Output format

```markdown
# Threat model - <feature name>

**Spec source:** <path or URL>
**Date:** YYYY-MM-DD
**Spec authors should review every row.** A generated threat model is a
starting point, not a sign-off.

## Assets identified

| Asset | Trust boundary | Sensitive |
|---|---|---|
| `users` table (PII) | server-side DB | yes |
| Session token (JWT) | client localStorage to server | yes |
| Profile photo upload | client to object store | partial |

## Threats

| ID | STRIDE | Asset | Threat | Likelihood | Impact | Score | Mitigation |
|---|---|---|---|---|---|---|---|
| T-S1 | Spoofing | JWT | Stolen JWT replayed; attacker assumes user identity | 2 | 3 | 6 | Short-lived access tokens; refresh-token rotation; bind to client fingerprint or mTLS. ASVS 4.0.3 V3.5. |
| T-T1 | Tampering | Upload | Malformed image overflows the image-processing library | 2 | 3 | 6 | Hardened decoder; type by file content, not extension; per-user upload rate limits. ASVS 4.0.3 V12.2.1, V12.1.3. |
| T-I1 | Info disclosure | `users` table | Verbose errors leak DB column names | 2 | 2 | 4 | Generic error to client with a correlation ID; structured logging server-side only. ASVS 4.0.3 V7.4.1. |
| T-E1 | Elevation of privilege | Admin endpoint | Missing role check lets a non-admin call an admin route | 1 | 3 | 3 | Centralize authorization on the service layer; integration test asserts 403 for non-admin tokens on every admin route. ASVS 4.0.3 V4.1.1, V4.1.5. |

Scoring: likelihood x impact, each 1 (low) to 3 (high). Practitioner
convention, not part of STRIDE. 6 and above lands before ship; 3 to 5 are
backlog candidates; below 3 may be accepted with written rationale.

## Open questions for the spec author

<clarifying questions where the walk uncovered ambiguity>
```

Column notes: `ID` is `T-<letter><n>` so rows stay referenceable from tickets
and test names. `Asset` names the specific element from the Step 1 inventory,
never a whole subsystem. `Threat` is one sentence describing the attack, in the
attacker's terms. `Mitigation` names a control plus its verification anchor.

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Generic "use TLS" mitigations | Every web app already terminates TLS. The row consumes review attention and changes nothing | Name the specific control for *this* asset plus its verification requirement |
| One row per STRIDE category regardless of relevance | Turns the table into a form to be filled in; reviewers stop reading | Filter in Step 3. Empty categories are a finding, not a gap |
| STRIDE-per-element applied mechanically to every element | Dozens of rows, uniform and unprioritized, buries the three that matter | Use the element matrix to narrow, then rank by score and lead with the top rows |
| Fabricating threats when the inventory is empty | Destroys trust in every future threat model the team reads | State that no STRIDE-relevant assets were identified |
| Recording spec ambiguity as a security finding | Vague wording is a requirements defect; filing it here hides it from whoever fixes requirements | Put it under "Open questions for the spec author" |
| Modelling only the synchronous request path | Queues, cron jobs, and batch workers carry the same threat surface | Inventory async processes and flows in Step 1 alongside request handlers |
| Presenting the 1-3 score as a standard | Invites false precision and cross-team comparison the numbers cannot support | Label it as a team convention wherever it appears, as the output template does |

## Limitations

- **A threat model is unproven by construction.** Every row is a hypothesis
  about a design. Confirming exploitability is a separate activity.
- **Completeness is not achievable.** Microsoft's own position is that STRIDE
  was not "developed with any real academic rigor" and that a mitigated model
  does not prove a system secure, because "frequently threats materialize only
  when systems are joined to create larger systems"
  ([ms-dreadful][ms-dreadful], [ms-stride-approach][ms-stride-approach]).
- **Category assignment is ambiguous by design.** The letters cross-correlate
  ([ms-dreadful][ms-dreadful]). Consistency within one document matters; a
  globally correct assignment does not exist.
- **ASVS requirement IDs are version-scoped.** The IDs used above are ASVS
  4.0.3. Later ASVS releases renumber chapters, so restate the version wherever
  a requirement ID appears ([owasp-asvs][owasp-asvs]).
