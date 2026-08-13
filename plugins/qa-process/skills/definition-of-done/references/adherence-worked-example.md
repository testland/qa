# Worked example - DoD adherence review

Deep reference for the `definition-of-done` SKILL.md "Auditing adherence" section. A full stage-2 audit end to end, using the audit report shape in the spine. Note at the end what the example deliberately does NOT do - those are authoring-side moves the audit never makes.

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
