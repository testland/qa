---
name: dod-adherence-review
description: "Audits an existing Definition of Done checklist line by line against repository evidence (review records, diffs, CI runs, coverage reports, scan output) and tags every line met, not met, or unverifiable, refusing to pass a line on self-attestation or on a claim with no matching diff. Covers the line-pattern-to-evidence mapping for the common checklist shapes (code reviewed, coverage threshold, docs updated, acceptance criteria covered, staging deploy plus smoke, no new accessibility regressions, telemetry wired), the entry-stage versus exit-stage split many teams run, the roll-up verdict rules, and the audit table that gets emitted. Does not author, revise, or soften the checklist. Use when a story or pull request is about to be marked done and a committed Definition of Done exists that nobody has actually checked the work against."
---

# dod-adherence-review

## What this owns, and what it does not

This is a **compliance audit of work against a checklist that already exists**.
The checklist is an input, treated as fixed for the duration of the audit. The
output is a per-line verdict backed by artifacts.

Authoring a Definition of Done is a different job with a different output: that
work decides *which lines belong on the list*, negotiates thresholds, and
produces a checklist file. Guidance for that lives with DoD-authoring material,
not here. The split matters because the two jobs pull in opposite directions:
authoring is collaborative and can trade a line away, auditing is adversarial
and cannot. If a line turns out to be unenforceable, that is a finding to hand
back to the authoring conversation, not a licence to skip the line.

Concretely, in scope here: parsing a checklist into atomic lines, mapping each
line to the artifact that would prove it, reading that artifact, assigning one
of three states, and rolling up a verdict. Out of scope: proposing new lines,
deleting lines, changing a threshold, or judging whether the checklist is a
*good* checklist.

## What the Scrum Guide actually says

The Definition of Done is a Scrum term with a fixed definition. The 2020 Scrum
Guide ([scrumguides.org/scrum-guide.html](https://scrumguides.org/scrum-guide.html))
states:

> "The Definition of Done is a formal description of the state of the Increment
> when it meets the quality measures required for the product."

It also fixes the consequence of a miss:

> "If a Product Backlog item does not meet the Definition of Done, it cannot be
> released or even presented at the Sprint Review. Instead, it returns to the
> Product Backlog for future consideration."
> ([scrumguides.org/scrum-guide.html](https://scrumguides.org/scrum-guide.html))

And it fixes who owns the content:

> "If the Definition of Done for an increment is part of the standards of the
> organization, all Scrum Teams must follow it as a minimum. If it is not an
> organizational standard, the Scrum Team must create a Definition of Done
> appropriate for the product."
> ([scrumguides.org/scrum-guide.html](https://scrumguides.org/scrum-guide.html))

Two things follow directly and are the whole basis of this audit. The team (or
the organization) owns the lines, so the audit never invents or edits them. And
a miss has a defined consequence, so "not met" is not advisory.

**Framing changed in 2020.** The November 2020 revision made the Definition of
Done a formal *commitment* attached to the Increment artifact, alongside the
Product Goal for the Product Backlog and the Sprint Goal for the Sprint Backlog
([scrumguides.org/revisions.html](https://scrumguides.org/revisions.html)):
"Each of the three artifacts now contain 'commitments' to them. For the Product
Backlog it is the Product Goal, the Sprint Backlog has the Sprint Goal, and the
Increment has the Definition of Done (now without the quotes)." Earlier editions
carried the concept without that artifact pairing and wrote it as Definition of
"Done" in quotes. Cite the 2020 wording, and do not attribute the commitment
framing to pre-2020 Scrum.

**Do not over-attribute.** The Scrum Guide does not prescribe any checklist
content, any coverage number, any verdict vocabulary, or any second checklist
for work entering development. Everything in the next section is practitioner
convention. The term is also not defined in the ISTQB glossary (V4.7.2 returns
"Term not found" for it at
[glossary.istqb.org](https://glossary.istqb.org/)), so Scrum is the only
standards-level anchor available.

## The two-stage split (practitioner convention, not Scrum)

The Scrum Guide defines exactly one Definition of Done, on the exit side, bound
to the Increment ([scrumguides.org/scrum-guide.html](https://scrumguides.org/scrum-guide.html)).
Many teams in practice also run an entry-side checklist for work about to be
picked up. That second checklist is a **convention with no standing in the
Scrum Guide**. It is still auditable, and the method below works on it, but do
not call it a Definition of Done in a report and do not cite Scrum for it.

| Stage | Convention name in the wild | What is being asked | Typical line shapes |
|---|---|---|---|
| Stage 1 (entry) | ready for development | Is this specified well enough to start? | Title states user value in one sentence; acceptance criteria present; each criterion is testable; non-functional requirements identified for the scope; threat model exists for any change touching user data or auth; effort estimated; dependencies named. |
| Stage 2 (exit) | done | Does the finished work meet the quality bar? | Acceptance criteria all covered by passing tests; coverage on changed files at or above the team threshold; no new lint or type errors; security scan clean; accessibility scan clean for UI-touching changes; performance budget not regressed; visual baselines updated with a reviewer sign-off; docs updated; telemetry emitted for new code paths; migration and rollback documented for breaking changes; required approval count met. |

A release-candidate or tag audit is stage 2 run against a wider evidence window
(a range of commits rather than one branch), not a third method.

**Declare the stage before auditing.** The same phrase means different things
per stage. "Acceptance criteria" at stage 1 means *they exist and are testable*;
at stage 2 it means *they are covered by tests that ran and passed*. Auditing a
stage-1 line with stage-2 evidence expectations produces false failures.

## Step 1 - Pin the checklist revision and the evidence window

Two facts get recorded before any line is checked, because both move:

- **Which revision of the checklist applies.** Checklists get edited. Record the
  file path and the commit or date of the revision you are auditing against, and
  state it in the report. A verdict against an unnamed revision cannot be
  reproduced or contested.
- **What counts as the evidence window.** For a pull request this is the diff
  range and the CI runs attached to the head commit. For a release it is the
  commit range in the tag. Evidence outside the window does not count: a green
  CI run for a different SHA proves nothing about this one.

## Step 2 - Split the checklist into atomic lines

Every line must be independently checkable, or the verdict is ambiguous. Split a
compound line into its parts and audit each part:

```text
Source line:  "Tests for new behavior: coverage on changed files >=80%,
               and at least one test per acceptance criterion."

Audited as:   2a  coverage on changed files >= 80%
              2b  at least one test per acceptance criterion
```

Number the audited lines and keep the source line's own number visible, so the
team can trace a finding back to the wording they wrote.

**Do not derive lines from prose.** If the checklist is a paragraph rather than a
numbered or bulleted list, splitting it is an act of interpretation, and the
split decides what gets tested. Hand it back for the team to restructure into
discrete lines. This is a deliberate resolution of a disagreement between common
practice: some tooling happily accepts a free-text checklist inline, but a
free-text split silently substitutes the auditor's reading for the team's intent.

**Handle conditional lines explicitly.** Many lines carry an escape branch:
"documentation updated (or there is no user-facing change)". Such a line has two
satisfying branches, and you must show evidence for whichever branch is being
claimed. Evidence for the escape branch is still evidence: "no files under the
UI or API surface changed in the diff" is a checkable statement. A bare
assertion of the escape branch is not.

## Step 3 - Map each line to an evidence artifact

The mapping below covers the line shapes that recur across teams. Anything not
on it needs a team-declared convention before it is checkable, and lands
`unverifiable` until it has one.

| Line pattern | Artifact to read | How to read it |
|---|---|---|
| "reviewed by at least N engineers" | `gh pr view --json reviews,reviewDecision` | `reviews` and `reviewDecision` are documented JSON fields of `gh pr view` ([cli.github.com/manual/gh_pr_view](https://cli.github.com/manual/gh_pr_view)). Count entries whose review state is approving and whose author is not the change author. Review actions are `APPROVE`, `REQUEST_CHANGES`, `COMMENT` ([docs.github.com/en/rest/pulls/reviews](https://docs.github.com/en/rest/pulls/reviews)). |
| "coverage on changed files at or above X%" | `coverage/lcov.info` or the CI coverage report | In an LCOV tracefile each file section carries `LF:<number of instrumented lines>` and `LH:<number of lines with a non-zero execution count>`, with per-line counts in `DA:` and branch data in `BRDA:` ([manpages.debian.org geninfo(1)](https://manpages.debian.org/bookworm/lcov/geninfo.1.en.html)). Per-file line rate is `LH / LF`, computed only over files present in the diff. |
| "no new lint or type errors" | CI status checks for the head commit | `gh pr view --json statusCheckRollup` ([cli.github.com/manual/gh_pr_view](https://cli.github.com/manual/gh_pr_view)); compare against the same checks on the base. |
| "documentation updated" | `git diff --name-only <base>..<head>` ([git-scm.com/docs/git-diff](https://git-scm.com/docs/git-diff)) | Require at least one changed path under the docs surface. A changed file is necessary, not sufficient: it shows a doc changed, not that it describes this change. |
| "every acceptance criterion is covered by a passing test" | Criterion IDs in the ticket, plus test names or tags in the diff | Requires a team-declared convention linking criterion IDs to test names or tags. With no such convention, this is `unverifiable`, not `not met`. |
| "no new accessibility violations" | The accessibility scan output for both branches | An axe run returns a results object with a `violations` array ([github.com/dequelabs/axe-core](https://github.com/dequelabs/axe-core)). Compare violation count and rule IDs for the head branch against the base, not against zero, unless the line says zero. |
| "deployed to staging and smoke passed" | CI runs bound to the head commit | Require a completed deploy job and a completed smoke job, both for that exact SHA. |
| "telemetry or observability wired for new code paths" | The diff itself | Search the diff for the project's instrumentation calls on the newly added paths. A statement in the change description is not evidence. |
| "security review for auth, payments, or personal-data changes" | Linked review or threat-model record | Check the link resolves and is dated within the change window. Unlinked, it is `unverifiable`. |
| "no new tech debt without a logged issue" | Linked issue | Not derivable from artifacts. `unverifiable` by construction unless the team requires an issue link in the change description. |

**Thresholds come from the team's line, never from a default.** Numbers like 80%
coverage are widespread convention, not a standard, and the audit has no opinion
on the right number. Read the number out of the line being audited. If the line
names no number ("good test coverage"), the line is `unverifiable` and the
finding is that the line is unenforceable as written.

## Step 4 - Assign one of three states

Three states, not two. This is practitioner convention, and it exists because
collapsing to a binary mislabels an *evidence* gap as a *work* gap and sends
the author off to fix something that may already be fine.

| State | Meaning | Required to assign it |
|---|---|---|
| `met` | The artifact exists and shows the line satisfied. | Name the artifact and the value read from it. |
| `not met` | The artifact was located and read, and it shows the line unsatisfied. | Name the artifact and the shortfall (actual versus required). |
| `unverifiable` | The line cannot be settled from artifacts within the evidence window. | State what was searched for and why it was inconclusive, and name what the team would have to supply. |

`unverifiable` is a real finding, not a shrug. It means one of: the line names no
checkable condition, the required convention does not exist, or the artifact was
never produced. Each of those is worth reporting back.

The three states apply per line and are never averaged. A checklist is not
scored out of ten.

## Step 5 - Apply the evidence standards

These four rules decide what counts as proof. They are the difference between an
audit and a rubber stamp.

- **Self-attestation is not evidence.** A change description that says "tests
  pass" without a linked run does not satisfy a tests-pass line. Look for the
  artifact, not the claim. The same applies to a checkbox ticked in a pull
  request template: the tick is the claim under audit, not proof of it.
- **A doc claim with no diff is not evidence.** "Updated the docs" with no
  changed documentation file in `git diff --name-only`
  ([git-scm.com/docs/git-diff](https://git-scm.com/docs/git-diff)) is
  unsupported. Mark it `not met`.
- **Pre-existing failure is not a free pass.** If a line says the performance
  budget is not regressed and the budget was already breached on the base
  branch, the change does not inherit the breach as an acceptable baseline.
  Report it `not met` against the line as written. Whether to fix it here or
  split it into a separately agreed deferral is the team's call, made
  explicitly, not absorbed silently.
- **Urgency and size do not waive lines.** A line is not skipped because the
  change is small, or the release is hot. If a team wants a faster bar for
  hotfixes, that is a separate written checklist to audit against, not an
  in-flight waiver.

## Step 6 - Roll up to a verdict

Per-line states combine into exactly one overall verdict:

| Condition | Verdict |
|---|---|
| Every line `met` | `ACCEPT` |
| Any line `not met` | `REJECT` |
| No line `not met`, at least one `unverifiable` | `REJECT`, pending named human confirmation |
| No checklist found, or the checklist is prose that has not been split | `INCONCLUSIVE` |

Notes on the two non-obvious rows:

- **`unverifiable` never auto-passes.** An unresolved unknown recorded as a pass
  is how a team convinces itself it is done when it is not. It clears only when
  a named person supplies the missing evidence, which is then recorded like any
  other artifact and the line flips to `met`. The auditor does not flip it.
- **No checklist means no verdict.** Neither `ACCEPT` nor `REJECT` is well
  formed without a checklist to check against, and inventing a plausible generic
  one substitutes the auditor's judgment for the team's, which the Scrum Guide
  assigns to the team or the organization
  ([scrumguides.org/scrum-guide.html](https://scrumguides.org/scrum-guide.html)).
  Report `INCONCLUSIVE` and say what was searched.

**Scope one audit to one artifact.** One pull request, one story, or one release
candidate. Rolling several changes into a single verdict conflates the health of
a sprint with the compliance of a change, and produces a verdict nobody can act
on.

## Output format

```markdown
## DoD adherence review - <artifact under audit>

**Stage:** stage-1-entry | stage-2-exit
**Checklist source:** <path> @ <revision>, <N> lines split into <M> audited lines
**Evidence window:** <base>..<head>, CI runs for <sha>
**Verdict:** ACCEPT | REJECT | INCONCLUSIVE
**met: <x>   not met: <y>   unverifiable: <z>**

| # | Checklist line | State | Evidence sought | What was found |
|---|---|---|---|---|
| 1 | ... | met | ... | ... |

### Not met

**Line <n> - <short label>**
- Required: <the condition as the line states it>
- Actual: <value read from the artifact>
- Artifact: <path or run reference>

### Unverifiable

**Line <n> - <short label>**
- Searched: <where you looked>
- Blocked by: <missing convention or missing artifact>
- To resolve: <exactly what the team must supply>

### Recommended action

<one sentence, tied to the verdict rules>
```

## Worked example

Checklist (`docs/definition-of-done.md` @ `a91c4f2`, stage 2), audited against
pull request 4567, diff `main..feat/promo-codes`:

```markdown
1. Code reviewed by at least one other engineer.
2. Unit test coverage on changed files >= 80%.
3. User-facing documentation updated (or no user-facing change).
4. All acceptance criteria from the story pass.
5. Deployed to staging and smoke suite green.
6. No new accessibility violations.
7. Telemetry wired for new features.
```

Output:

```markdown
## DoD adherence review - PR #4567 "Add promo codes to checkout"

**Stage:** stage-2-exit
**Checklist source:** docs/definition-of-done.md @ a91c4f2, 7 lines split into 7 audited lines
**Evidence window:** main..feat/promo-codes (head 3f0be21), CI runs for 3f0be21
**Verdict:** REJECT
**met: 4   not met: 2   unverifiable: 1**

| # | Checklist line | State | Evidence sought | What was found |
|---|---|---|---|---|
| 1 | Reviewed by >=1 other engineer | met | approving reviews from non-authors | 2 approving reviews, neither by the author |
| 2 | Coverage on changed files >= 80% | not met | LH/LF per changed file in coverage/lcov.info | src/checkout/promo.ts LF:112 LH:73, 65.2% |
| 3 | Docs updated, or no user-facing change | met | changed docs paths, or absence of user-facing diff | escape branch: diff touches no UI, API schema, or copy files |
| 4 | All acceptance criteria pass | unverifiable | tests named or tagged for AC-1..AC-3 | no criterion-to-test convention exists in this repo |
| 5 | Deployed to staging, smoke green | not met | deploy + smoke jobs for 3f0be21 | no deploy job ran for this SHA |
| 6 | No new accessibility violations | met | violations array, head vs base | 4 violations on both branches, same rule IDs, none new |
| 7 | Telemetry wired | met | instrumentation calls on new code paths | track('promo.applied') added in src/checkout/promo.ts |

### Not met

**Line 2 - coverage on changed files**
- Required: >= 80% per changed file
- Actual: src/checkout/promo.ts at 65.2% (LF:112, LH:73); other changed files pass
- Artifact: coverage/lcov.info from CI run for 3f0be21

**Line 5 - staging deploy and smoke**
- Required: deployed to staging, smoke suite green
- Actual: no deploy job present in any CI run bound to 3f0be21
- Artifact: CI run list for 3f0be21

### Unverifiable

**Line 4 - acceptance criteria**
- Searched: test names and tags in the diff for AC-1, AC-2, AC-3 as written in the story
- Blocked by: no declared convention linking criterion IDs to tests, so absence of a match proves nothing
- To resolve: either adopt a criterion-ID tag on tests, or have the person who ran the criteria confirm each one and link the run

### Recommended action

REJECT: two lines not met and one unverifiable. Line 4 does not become a pass by
default; a named person confirms it with a linked artifact.
```

Note what the example does not do: it does not suggest lowering line 2 to 65%,
does not drop line 4 as unenforceable, and does not average the seven lines into
a percentage. Those are all authoring-side moves.

## Anti-patterns

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Treating `unverifiable` as a pass | Hides the unknown; the team believes it is done when nothing was checked | Verdict rules in Step 6: unverifiable blocks until a named human supplies evidence |
| Auditing against a generic checklist because the team has none | Substitutes the auditor's bar for the team's, which the Scrum Guide assigns to the team or organization ([scrumguides.org/scrum-guide.html](https://scrumguides.org/scrum-guide.html)) | Report `INCONCLUSIVE` and list where you searched |
| Splitting a prose checklist yourself | The split decides what gets tested; the team's intent is silently replaced | Hand it back for restructuring into numbered lines (Step 2) |
| Skipping a line because it is "obviously" fine | The obvious lines are where drift hides, and an unstated pass is unauditable | Every line gets an explicit state and named evidence |
| Rewriting or softening a line mid-audit | The checklist stops being a fixed bar and becomes negotiable under deadline | Record the finding; renegotiation happens in the authoring conversation, afterwards |
| One audit spanning several changes or a whole sprint | Conflates sprint health with per-change compliance | One artifact per audit (Step 6) |
| A one-shot verdict that is never re-run | The change evolves after the audit; the verdict goes stale and is trusted anyway | Re-run against the new head; the verdict is bound to the SHA recorded in the report |
| Accepting a ticked template checkbox as evidence | The tick is the claim under audit | Step 5: find the artifact, not the claim |
| Passing a coverage line using an overall repository percentage | A high repo-wide number hides an untested new file | Compute per-file rates over the files in the diff only (Step 3) |

## Limitations

- **Roughly half of a typical checklist is not machine-checkable.** Lines about
  review quality, "no new tech debt", or whether a doc is actually *about* the
  change resolve to `unverifiable` by construction. That is the honest answer,
  and the report should say what a human would need to check.
- **Presence is not correctness.** A changed documentation file satisfies "docs
  updated" structurally; nothing in this method reads the doc to confirm it
  describes the change.
- **Per-line verification is bespoke.** The Step 3 mapping covers the common
  shapes. A line naming a team-specific artifact needs a team-specific reading
  rule before it is checkable at all.
- **Evidence outside the window is invisible.** A manual test run on a laptop, a
  design review held in a meeting, or a scan run before the last force-push do
  not exist as far as the audit is concerned unless they are recorded.
- **The verdict is advice, not enforcement.** It states whether the artifacts
  support the checklist. Deciding to ship anyway is a human decision, and one
  worth recording next to the report.
