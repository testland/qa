---
name: spec-testability-heuristics
description: "Judges whether a written requirement can be tested at all, by scoring each claim against three heuristics: Observable (a state or output visible from outside the system), Decidable (a deterministic pass/fail against a named oracle), and Bounded (stated inputs, states, and users). Supplies untestable-to-testable rewrite pairs per heuristic, severity assignment, a BLOCK / REVIEW / OK verdict rule, a findings table that pairs every flagged sentence with a concrete replacement, and the review workflow for running the rubric against a story, PRD section, PR description, or spec at sprint planning or PR review, with per-verdict hand-off targets. Scope is testability only: it does not write the tests, rank risk, or judge whether the requirement is correct or complete. Use when a user story, acceptance criterion, PRD section, API contract, or PR description is about to be handed to implementation and someone needs to know which sentences cannot be verified as written."
---

# spec-testability-heuristics

## What testability means here

ISTQB defines **testability** as "the degree to which test conditions can
be established for a component or system, and tests can be performed to
determine whether those test conditions have been met"
([ISTQB Glossary, testability](https://glossary.istqb.org/en_US/term/testability)).
A sentence from which no test condition can be established is not a weak
requirement, it is an untestable one, and no downstream tooling fixes it.

Applying the rubric before implementation starts is the **shift left**
approach. A requirement rewritten during review costs a sentence; the same
requirement discovered as untestable after the code lands costs a rewrite,
a re-implementation, and a re-review.

## What this skill judges, and what it does not

This skill answers exactly one question per sentence: **can this claim be
tested as written?**

It deliberately does **not**:

| Out of scope | Why it is a different job |
|---|---|
| Writing the tests | Turning a passing claim into Given/When/Then, a test case, or an assertion is a downstream formatting step with its own output shape. |
| Assessing risk or priority | A perfectly testable claim can be trivial, and a critical claim can be untestable. Testability and importance are independent axes. |
| Checking correctness | "p95 latency is under 10 hours" is fully testable and probably wrong. This rubric passes it. Product judgment is a separate review. |
| Checking completeness | Missing requirements are invisible to a rubric that reads only the sentences present. A coverage review looks for what is absent; this looks at what is there. |
| Proofreading | Typos, tense, and house style are not testability defects. A misspelled but Observable, Decidable, Bounded claim is OK. |

If a claim passes all three heuristics, it is OK regardless of prose
preference. Stylistic nitpicks are not findings.

## The three heuristics

A claim is testable when **all three** hold. Each heuristic below gives
the failure signature, untestable examples, and the testable rewrite of
each one.

### Heuristic 1: Observable

The claim describes a state or output that can be observed from **outside**
the system. This is what makes a test condition establishable at all, and
it is why ISTQB defines an **expected result** as "the observable
predicted behavior of a test item under specified conditions based on its
test basis"
([ISTQB Glossary, expected result](https://glossary.istqb.org/en_US/term/expected-result)).
If nothing observable is predicted, there is nothing to compare an actual
result against.

Failure signature: an adjective or an internal-state verb with no
externally visible referent. Words such as fast, clean, robust, seamless,
intuitive, modern, secure, scalable, and any verb describing what a user
feels rather than what the system emits.

| Untestable | Why it fails | Testable rewrite |
|---|---|---|
| "The system will be fast." | No observable threshold and no named surface. | "p95 page-load time on `/dashboard` is at most 2.5s under 100 concurrent users." |
| "Users will enjoy the new flow." | Enjoyment is not emitted by the system. | "Users complete the new onboarding flow in at most 90 seconds (median, n at least 30)." |
| "The data will be clean." | No assertion can be written against "clean". | "Every row in `customers.email` matches the email regex; the `not_null` check passes." |

The rewrite move for Observable is: **name the surface, name the metric,
name the number.**

### Heuristic 2: Decidable

A test run against the claim produces a deterministic pass or fail. In
ISTQB terms the claim must supply, or point at, a **test oracle**: "a
source to determine an expected result"
([ISTQB Glossary, test oracle](https://glossary.istqb.org/en_US/term/test-oracle)).
Observable and Decidable are distinct. "The page renders a banner" is
observable but not decidable until the banner's identity is pinned down;
two reviewers would disagree on whether a given banner counts.

Failure signature: a comparative or qualitative judgement with no
reference point. Words such as good, graceful, appropriate, reasonable,
better, consistent, and any regression claim with no stated baseline.

| Untestable | Why it fails | Testable rewrite |
|---|---|---|
| "The page should look good on mobile." | "Good" has no oracle; two reviewers disagree. | "Visual snapshot at 375px viewport matches the approved design frame." |
| "Errors should be handled gracefully." | "Graceful" has no oracle. | "On a 5xx response, the UI shows a retry banner with `data-testid=\"retry-banner\"`." |
| "Performance should not regress." | A comparison with no baseline named. | "p95 latency on `POST /orders` does not regress more than 10% versus the current trunk build." |

The rewrite move for Decidable is: **name the oracle** - a golden file, an
approved baseline, a prior build, a schema, a specific selector, a status
code, or a fixed expected value.

### Heuristic 3: Bounded

The claim names which inputs, states, and users it applies to. Without
boundaries the test surface is unbounded, and no finite suite can claim to
have covered it. This is the precondition for the standard black-box
techniques: **equivalence partitioning** exercises "one representative
member of each partition"
([ISTQB Glossary, equivalence partitioning](https://glossary.istqb.org/en_US/term/equivalence-partitioning))
and **boundary value analysis** uses boundary values as test conditions
([ISTQB Glossary, boundary value analysis](https://glossary.istqb.org/en_US/term/boundary-value-analysis)).
Neither technique can be applied to a claim that never says what the input
domain is. ISTQB's expected result is likewise defined "under specified
conditions"
([ISTQB Glossary, expected result](https://glossary.istqb.org/en_US/term/expected-result)).

Failure signature: a universally quantified verb with no domain. "Works",
"applies", "returns", "handles", "supports", stated without saying for
whom, for what input, or in what state.

| Untestable | Why it fails | Testable rewrite |
|---|---|---|
| "Search returns relevant results." | Relevant to whom, for which query? | "For a logged-in user with a search history, the top result for the query `<previous_query>` is the most recently viewed item." |
| "Login works." | Which user, which auth method, which device? | "Email and password login succeeds for accounts with `status: active` and rejects accounts with `status: suspended` with `401`." |
| "Discounts apply correctly." | To which products, which user tiers? | "Promo code `SAVE20` reduces the order total by 20% for non-tax line items only and does not apply to subscriptions." |

The rewrite move for Bounded is: **name the actor, the input domain, and
the excluded cases.** The excluded cases matter as much as the included
ones; "does not apply to subscriptions" is what turns one vague sentence
into a negative test.

### Numbers in the rewrites

The thresholds in the rewrite columns above (2.5s, 90 seconds, 10%, 20%)
are illustrative placeholders, not recommended values. The heuristic only
requires that **some** number chosen by the team is present. Where a
rewrite cites an external threshold, the source is given at the point of
use.

## How to apply the rubric

1. **Split the text into claims.** A claim is a sentence that asserts what
   the system will, must, or should do. Headings, background prose,
   rationale, and open questions are not claims and are not scored.
   Compound sentences joined by "and" that assert two behaviors are two
   claims.
2. **Test each claim against all three heuristics** in order. Record every
   heuristic it fails, not just the first.
3. **Assign severity** using the table below.
4. **Write a concrete rewrite for every failing claim.** A finding with no
   proposed replacement is not a finding, it is a complaint.
5. **Compute the verdict** from the severities.
6. **Emit the findings table.**

### Severity assignment

| Claim fails | Severity | Rationale |
|---|---|---|
| Observable (with or without others) | Block | Nothing can be measured; the requirement has to change before anyone can build to it. |
| Decidable (with or without Bounded) | Block | A test can be run but its result is arguable, so the suite proves nothing. |
| Bounded only | Review | The behavior is measurable and decidable; the missing piece is the input domain, which is usually a one-line clarification from the author. |
| Nothing | OK | Passes all three. |

This Block-versus-Review split is a **practitioner convention of this
rubric, not a standard**. It exists because an unbounded claim can be
fixed inline during review, whereas an unobservable or undecidable claim
usually needs a product decision. Teams that gate more aggressively can
promote Bounded failures to Block; nothing in the heuristics themselves
requires the split.

### Verdict rule

- **BLOCK**: at least one claim has severity Block.
- **REVIEW**: no Block, and at least one claim has severity Review.
- **OK**: every claim passes all three heuristics.

## Review workflow

Run the rubric as a read-only review at the cheapest possible moment -
during sprint planning or PR review, before the engineer starts coding. The
cheapest defect to fix is the one prevented before it's coded.

1. **Read the input artifact.** Any of: a user story / Linear / Jira ticket
   body, a PRD or design-doc section, a PR description (the proposed change,
   not the diff), or a feature-spec markdown checked into the repo.
2. **Tokenize the artifact into claims** - sentences asserting what the
   system "will" / "must" / "should" do - per step 1 of "How to apply the
   rubric" above.
3. **Score every claim** against all three heuristics, assign severity,
   compute the verdict.
4. **Emit the findings table and verdict** in the output format below -
   every row carries a concrete suggested rewrite.

Hand-off targets by verdict:

- **OK** - convert to Gherkin via `gherkin-from-stories` (qa-bdd plugin).
- **BLOCK on a non-functional claim** (perf, a11y, security) - formalize via
  `non-functional-requirement-extractor`.
- **BLOCK on a data-pipeline claim** - formalize the schema via
  `data-contract-extractor` (qa-data-quality plugin).
- **Whole-story readiness before dev** - the Definition-of-Done audit
  workflow in the `definition-of-done` skill (qa-process plugin).

## Output format

```markdown
## Testability review - verdict: <BLOCK|REVIEW|OK>

**Artifact:** <identifier of the text reviewed>
**Claims found:** N
**Untestable claims:** M

### Findings

| Severity | Claim text | Heuristic violated | Suggested rewrite |
|----------|------------|--------------------|-------------------|
| Block    | "The system will be fast."             | Observable (no threshold) | "p95 latency on `POST /api/orders` is at most 200ms under 50 concurrent users." |
| Block    | "Errors should be handled gracefully." | Decidable + Observable    | "On a 5xx response from `POST /api/orders`, the UI shows a retry banner (`data-testid=\"retry-banner\"`) and queues the request for retry on the next user action." |
| Review   | "Search returns relevant results."     | Bounded                   | "For `query='X'`, the top 3 results contain items where `tags` includes 'X' OR `title` contains 'X', case-insensitive." |
| OK       | "p95 latency on `POST /orders` is at most 200ms at 50 RPS." | (passes all three) | n/a |
```

Every row carries a rewrite. Rows are ordered Block, then Review, then OK.

## Worked examples

Three worked reviews - one BLOCK verdict (vague PRD prose), one OK verdict
(concrete acceptance criteria), and one REVIEW verdict (a Bounded-only
failure) - are in
[references/worked-examples.md](references/worked-examples.md).

## Anti-patterns when applying the rubric

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| "Make this more testable" with no rewrite | Hands the problem back without reducing it. The author is stuck exactly where they were. | Every finding row carries a specific replacement sentence. |
| Flagging style as testability | Prose preference is not a test condition. A blunt sentence that passes all three heuristics is OK. | Score only against Observable, Decidable, Bounded. |
| Treating typos as findings | Misspellings are proofreading. | Leave them. If a typo makes a claim genuinely ambiguous, flag the ambiguity, not the spelling. |
| Scoring non-claims | Rationale, background, and open questions are not assertions about system behavior. | Count only sentences asserting what the system will, must, or should do. |

## Limitations

- **The rubric reads only what is written.** A spec can score OK on every
  sentence and still be missing the entire error path. Completeness review
  is a separate pass.
- **Testable is not correct.** The rubric will pass a precisely stated,
  wrong requirement without comment.
- **Testable is not important.** Severity here measures verifiability, not
  business risk. Ranking what to test first is a different exercise.
