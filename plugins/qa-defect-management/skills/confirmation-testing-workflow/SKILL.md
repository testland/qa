---
name: confirmation-testing-workflow
description: "Procedure for proving that a claimed defect fix actually reached the build under test and actually works. Covers the merge-base ancestry check that proves the running build contains the fix commit rather than trusting a version label, the priority order for choosing which reproduction to re-run, and the VERIFIED / NOT FIXED / BLOCKED verdict table whose governing rule is that any ambiguous, flaky, or unreproducible result resolves to BLOCKED and is never guessed. Scoped to ISTQB confirmation testing (does this specific fix work?), not regression testing (did the fix break something else?), and not triage or severity assignment. Use when a developer has marked a defect Fixed and someone must decide whether it moves to Verified or back to Reopened."
---

# confirmation-testing-workflow

The evidence procedure that justifies moving a defect out of **Fixed**: prove
the build under test contains the fix, re-run the reproduction that failed
before the fix, and classify the result.

## What this owns, and what it does not

The axis is **verification procedure vs lifecycle vocabulary**: a lifecycle
catalog owns the state names and legal transitions; this procedure owns the
evidence that justifies picking one. It answers "may I claim Verified?", not
"what states exist?". Out of scope: triage of the original defect (decided
before a fix), severity and priority (separate axes, unchanged here), and the
broader regression suite (a different activity - see below).

## Confirmation testing is not regression testing

Both are change-related testing; conflating them is a common error.

| | Question answered | ISTQB scope |
|---|---|---|
| **Confirmation testing** | Does *this* fix work? | after fixing a defect, confirm the failure it caused no longer reoccurs ([glossary.istqb.org/en_US/term/confirmation-testing](https://glossary.istqb.org/en_US/term/confirmation-testing)) |
| **Regression testing** | Did the fix break something else? | detect defects introduced or uncovered in unchanged areas ([glossary.istqb.org/en_US/term/regression-testing](https://glossary.istqb.org/en_US/term/regression-testing)) |

The confirmation-testing glossary entry lists **retesting** as its synonym; the
Foundation Level syllabus v4.0 §2.2.3 pairs the two activities in one section
([istqb.org/certifications/certified-tester-foundation-level](https://www.istqb.org/certifications/certified-tester-foundation-level/)).
Consequence: a green regression suite is not confirmation the defect is fixed,
and a passing confirmation test is not evidence nothing else broke. Run and
report them separately.

## Input this procedure assumes

A **fix commit SHA** that is already merged into the target branch, plus the
name of the environment under verification. A pull request number, a release
note, or a Jira comment saying "fixed" is not a SHA. If no merged commit
exists yet, there is nothing to confirm: confirmation testing is performed
"after fixing a defect" by the definition above.

## Step 1 - Prove the build under test contains the fix

This is the step teams skip, and skipping it produces both false NOT FIXED
verdicts (the fix was never deployed) and false VERIFIED verdicts (a different
change masked the symptom).

**Do not trust a version label.** A tag, a release name, a `package.json`
version, a "deployed 14:02" timestamp, or a green deploy pipeline are all
claims *about* a build, not properties *of* it. Version strings get bumped in
a separate commit from the fix, deploys get rolled back, and hotfix branches
get cut from a base that predates the fix.

Trust an ancestry check instead. `git merge-base --is-ancestor <A> <B>` checks
whether the first commit is an ancestor of the second and exits **0 if true, 1
if not**; errors are signalled by "a non-zero status that is not 1" (per
[git-scm.com/docs/git-merge-base](https://git-scm.com/docs/git-merge-base)).

```bash
git merge-base --is-ancestor "$FIX_SHA" "$BUILD_SHA"
case $? in
  0) echo "CONTAINS FIX" ;;
  1) echo "MISSING FIX" ;;
  *) echo "CHECK ERRORED - treat as unknown, not as MISSING" ;;
esac
```

Read the three outcomes as three different things:

| Exit status | Meaning | Verdict consequence |
|---|---|---|
| `0` | The build under test descends from the fix commit | Proceed to Step 2 |
| `1` | The fix is genuinely absent from this build | **BLOCKED**: name the gap, do not re-run |
| other | The check itself failed (unknown SHA, shallow clone, wrong repo) | **BLOCKED**: the containment question is unanswered |

Two arguments are needed, so the environment must expose the **commit SHA it
was built from**, not just a version number. If it exposes only a version
label, the containment question cannot be answered and the verdict is BLOCKED
until build metadata is added. That is a real finding worth reporting, not a
reason to guess.

Two common traps this catches:

- **A shallow or partial clone** can make an ancestry check error out or answer
  from truncated history. Verify against a repository with the full history
  reachable from both SHAs.
- **The branch moved.** Check ancestry against the **exact SHA the environment
  is running**, not against the branch tip, which may have advanced past it.

When the check exits 1, stop and name the gap concretely, for example: staging
is on `3f1d0aa`, and fix `9c4e7b2` is not an ancestor of it. Re-running the
reproduction there would only re-confirm the original failure and would produce
a NOT FIXED verdict that blames the developer for a deployment problem.

## Step 2 - Choose the reproduction, in priority order

Re-run the *narrowest artifact that failed before the fix*. Prefer the highest
available source:

1. **The committed automated reproduction test.** A test written against this
   defect that was red before the fix. Strongest evidence: its pre-fix red
   state is recorded in history, so its post-fix green state is a real
   before/after comparison rather than an assertion that has never failed.
2. **Written reproduction steps from the defect report.** The commit plus
   command plus observed-versus-expected block. Weaker, because a human
   executes it and the pre-fix failure is attested rather than recorded.
   Convert them into a numbered re-verification script (precondition, steps
   1..N, expected result per step) and record the human's outcome verbatim.
3. **A recorded artifact:** a replayable session, a HAR capture, a video, a
   crash dump with the triggering input. Weakest of the three, because replay
   fidelity varies, but still an artifact rather than a memory.

**If none of the three exists, the verdict is BLOCKED.** Verification without a
reproduction is an opinion. The route out is to build a reproduction first,
which is separate work with its own output.

Two disqualifiers apply regardless of tier:

- **A quarantined or known-flaky test cannot confirm anything.** Its pass rate
  is uncorrelated with the fix, so a green run is not evidence. Stabilise it
  first, then re-run.
- **A reproduction that never failed before the fix proves nothing.** If nobody
  can show the artifact red on a pre-fix commit, it is not a reproduction of
  this defect. Confirm the red state on the fix commit's parent before trusting
  the green state on the fix commit.

Run **exactly** that artifact, nothing wider. A broader suite dilutes the
signal and drags unrelated failures into the verdict.

## Step 3 - Verdict

| Verdict | Condition | Evidence that must be attached |
|---|---|---|
| **VERIFIED** | The reproduction that failed before the fix now passes, in a build proven to contain the fix | Verbatim passing output, fix commit SHA, environment name plus build SHA, ancestry-check result |
| **NOT FIXED** | The original failure still reproduces in a build proven to contain the fix | Verbatim failing output, and the observed-versus-expected delta |
| **BLOCKED** | The question could not be answered: no reproduction, ancestry check failed or errored, the reproduction is flaky or quarantined, or the result is ambiguous or partial | The specific blocker, and the concrete action that would clear it |

**The governing rule: uncertainty resolves to BLOCKED, never to a guess.**
BLOCKED is not a failure of the procedure, it is the correct output whenever
the evidence does not support a clean classification. Specifically:

- A partially passing run is BLOCKED, not VERIFIED.
- A run whose output cannot be tied to the defect's original symptom is
  BLOCKED, not VERIFIED.
- A pass on a build whose containment could not be proven is BLOCKED, not
  VERIFIED.
- A failure on a build proven **not** to contain the fix is BLOCKED, not NOT
  FIXED. Blaming the fix for a deployment gap costs a real reopen cycle.

VERIFIED is the only verdict that licenses a Fixed to Verified transition. NOT
FIXED licenses a reopen with the failing output attached. BLOCKED licenses
**neither**: record the blocker and leave the state where it is, because a
BLOCKED defect that is silently closed is exactly the failure mode the
verification gate exists to prevent.

## Output shape

```markdown
## Confirmation test result - <defect-id>

**Verdict:** VERIFIED | NOT FIXED | BLOCKED
**Fix commit:** `<sha>` on `<branch>`
**Environment:** <env>, build `<sha>`
**Containment check:** `git merge-base --is-ancestor <fix-sha> <build-sha>` exit <0|1|other>
**Reproduction:** <tier 1 test path | tier 2 manual script | tier 3 recording>
**Pre-fix state of that reproduction:** <red at <parent-sha> | attested by reporter>

### Re-run output

<verbatim runner output, or the recorded manual execution>

### Conclusion

<one sentence tying the output to the defect's original symptom>
```

## Worked example and anti-patterns

A full VERIFIED walkthrough (with its NOT FIXED and BLOCKED variants) and the
anti-pattern table are in [references/examples.md](references/examples.md).

## Limitations

- **Ancestry proves the source, not the artifact.** A commit being an ancestor
  of the build SHA does not prove the deployed binary was built from that
  source, that the migration ran, or that a feature flag gating the fix is on.
  For environments with an independent build pipeline, treat containment as
  necessary but not sufficient, and note any flag state in the report.
- **Merged is not deployed.** An ancestry check against the target branch shows
  the fix is in the branch. It says nothing about any environment until it is
  re-run against the SHA that environment actually reports.
- **Rebases and squashes change the SHA.** After a squash merge the original
  commit SHA is not an ancestor of anything. Use the SHA that landed on the
  target branch, and expect the pre-merge SHA to answer 1.
- **Confirmation of one defect only.** A VERIFIED verdict covers this defect's
  reproduction and nothing else. Pair it with a separate regression run before
  concluding the change is safe to release.
