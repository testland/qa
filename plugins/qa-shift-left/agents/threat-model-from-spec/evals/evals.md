---
component: threat-model-from-spec
type: agent
archetype: A4
---

# threat-model-from-spec — evals

Companion eval cases for [`threat-model-from-spec`](../../threat-model-from-spec.md).
Three cases cover happy path / branch / adversarial: a file-upload
feature spec (the worked example in the agent body), a read-only
profile-view branch (small surface, only S + I apply), and an
empty-spec refusal. Re-run by feeding the **Input** block as the first
user message and checking the agent's output against the
**Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date —
each case is designed to be reproducible against any tier.

## Eval 1 — happy path — profile photo upload (Tampering / DoS / Info disclosure)

**Input:**

```
Threat-model this spec excerpt:

  ## Profile photo upload
  Users can upload a profile photo from the settings page. We accept
  JPEG and PNG, up to 5 MB. Photos are stored in S3 under a path like
  `s3://acme-uploads/<userId>/<uuid>.jpg` and served via CloudFront
  CDN. The image-processing worker (sharp/libvips) resizes to 256x256
  and 64x64 thumbnails. Upload endpoint:
  `POST /api/upload/photo` (multipart/form-data), authenticated by the
  user's session cookie. Per-user upload rate is currently unlimited.

Write the artifact to docs/threat-models/2026-05-26-profile-photo-upload.md.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Step 1 tags assets — `users` profile records, S3 upload
keys, session cookie, image-processing worker, CDN. Step 2 emits one
row per relevant (asset × STRIDE category): T-T (decompression-bomb /
polyglot file), T-D (mass-upload exhausts S3 storage budget — no rate
limit named in spec is the controlling signal), T-I (predictable S3
URLs let attackers enumerate uploads), T-S (session replay). Step 3
filters out categories that don't apply (e.g., R — Repudiation is
weak here; agent should not force a row just to fill the matrix).
Step 4 scores each threat 1-3 × 1-3. Step 5 cites OWASP ASVS controls
(V12.4 file upload, V3.5 session, V4 access control) inline, not
generic "use TLS." Step 6 writes the artifact to the requested path.
The "Open questions" section flags the missing rate-limit policy as a
clarifying question for the spec author.

**Pass condition:** Output contains the literal string `STRIDE` AND
`Tampering` AND `OWASP ASVS` AND `decompression` (the canonical
file-upload bomb threat from the agent's worked example). Output
contains the artifact path
`docs/threat-models/2026-05-26-profile-photo-upload.md`. Output does
NOT contain a generic `Use TLS` mitigation row (rejected anti-pattern).

## Eval 2 — branch — read-only public marketing page (small or no surface)

**Input:**

```
Threat-model this spec excerpt:

  ## About page
  Static text content (company history, mission statement, team
  photos). Rendered by Next.js at build time, served from the CDN.
  No user input, no forms, no API calls from this page. Public —
  unauthenticated, indexable by search engines. Updates land via a
  marketing-team PR to `app/about/page.tsx` and roll out on the next
  deploy.

Write the artifact to docs/threat-models/2026-05-26-about-page.md.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Per the agent's worked example: "for a static text edit
on a public marketing page, the agent emits 'No STRIDE-relevant assets
identified' and recommends skipping; it does not fabricate threats."
Step 1 tags very few assets — the rendered HTML, the deploy pipeline
(an indirect supply-chain surface but out of scope for STRIDE applied
to this spec excerpt). Steps 2-5 emit either a single-row or empty
threats table with an explicit "No STRIDE-relevant assets identified
in the spec excerpt" note. Step 6 still writes the artifact (per the
output format) but the threats table is empty/near-empty by design.
Does NOT mechanically emit one row per STRIDE category to fill the
matrix (rejected anti-pattern: "One row per STRIDE category regardless
of relevance").

**Pass condition:** Output contains the literal string
`No STRIDE-relevant` or equivalent phrasing
(`no relevant STRIDE` / `no STRIDE-relevant assets`). Output does NOT
contain a populated threat row for category `R` / `Repudiation`
applied to a static About page (forcing R onto a content-only page is
the rejected anti-pattern). Output mentions the artifact path
`docs/threat-models/2026-05-26-about-page.md` (the write still
happens; the table is just minimal).

## Eval 3 — adversarial — no spec, just "model our app" (refuse)

**Input:**

```
Run a threat model on our app. We're a SaaS startup with users,
payments, dashboards, API integrations. Build the model.

(No spec content provided. No feature scope. No PRD section, no user
story, no design doc, no architecture sketch — just the request.)
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to produce a fabricated model. The agent's
description names the required input: "a feature specification (PRD
section, user story, design doc, or architecture sketch)." None of
these is supplied; "we have users, payments, dashboards, integrations"
is a product description, not a spec. The agent requests a concrete
spec excerpt or a path to one and refuses to enumerate threats for
features it has not read. Does NOT fabricate a generic STRIDE matrix
for "a SaaS app." Does NOT write any file under `docs/threat-models/`.
The "Anti-patterns" section's "Treating spec ambiguity as security
findings" rule informs the refusal — though here it's not even
ambiguity, it's absence.

**Pass condition:** Output asks for a concrete spec / PRD / user story
(contains `spec` or `specification` or `PRD` framed as a request /
clarifying question). Output does NOT contain a populated
`## Threats` markdown table with rows. Output does NOT contain a
`docs/threat-models/` artifact path being written. Output does NOT
fabricate threat IDs (`T-S1` / `T-T1` etc.) against assets the agent
has not been shown.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no external
  fixtures, no need to clone a sample repo. The spec excerpts are
  short enough to inline.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Write`, `Edit`, `Grep`, `Glob`)
  writes the threat-model markdown — eval 3 is observable as the
  absence of a populated threats table plus the absence of a written
  artifact under `docs/threat-models/`.
- Eval cases were authored 2026-05-26 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
