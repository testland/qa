---
name: spec-testability-heuristics
description: "Judges whether a written requirement can be tested at all, by scoring each claim against three heuristics: Observable (a state or output visible from outside the system), Decidable (a deterministic pass/fail against a named oracle), and Bounded (stated inputs, states, and users). Supplies untestable-to-testable rewrite pairs per heuristic, severity assignment, a BLOCK / REVIEW / OK verdict rule, and a findings table that pairs every flagged sentence with a concrete replacement. Scope is testability only: it does not write the tests, rank risk, or judge whether the requirement is correct or complete. Use when a user story, acceptance criterion, PRD section, API contract, or PR description is about to be handed to implementation and someone needs to know which sentences cannot be verified as written."
---

# spec-testability-heuristics

## What testability means here

ISTQB defines **testability** as "the degree to which test conditions can
be established for a component or system, and tests can be performed to
determine whether those test conditions have been met"
([ISTQB Glossary, testability](https://glossary.istqb.org/en_US/term/testability)).
A **test condition** in turn is "a testable aspect of a component or
system that is intended to be tested"
([ISTQB Glossary, test condition](https://glossary.istqb.org/en_US/term/test-condition)).

That definition is the whole point of this rubric: a sentence from which
no test condition can be established is not a weak requirement, it is an
untestable one. No amount of tooling fixes it downstream.

Testability is also a named concern of the ISO/IEC 25010:2023 product
quality model, whose abstract lists "eliciting and defining product and
information system requirements" and "validating the comprehensiveness of
requirements definition" among the activities the model supports
([ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html)). The
operative definition used throughout this skill is the ISTQB one above.

Applying the rubric before implementation starts is the **shift left**
approach: "a test approach to perform testing and quality assurance
activities as early as possible in the software development lifecycle"
([ISTQB Glossary, shift left](https://glossary.istqb.org/en_US/term/shift-left)).
A requirement rewritten during review costs a sentence. The same
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
the system. This is what makes a test condition establishable at all
([ISTQB Glossary, testability](https://glossary.istqb.org/en_US/term/testability)),
and it is why ISTQB defines an **expected result** as "the observable
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

### Example 1: PRD prose, verdict BLOCK

Input:

> "We will improve the checkout flow to feel modern and respond quickly.
> Users on mobile should have a smooth experience."

Output:

```markdown
## Testability review - verdict: BLOCK

**Artifact:** checkout redesign PRD, the two sentences above
**Claims found:** 3
**Untestable claims:** 3

### Findings

| Severity | Claim | Violation | Suggested rewrite |
|----------|-------|-----------|-------------------|
| Block | "feel modern"                   | Observable             | "Matches the approved design frame `Checkout-2026Q2`; the visual baseline test passes at the 375 / 768 / 1280 / 1920 viewports." |
| Block | "respond quickly"               | Observable             | "p95 page load on `/checkout` is at most 1.5s on a 4G profile; INP is at most 200ms during form interaction." |
| Block | "smooth experience [on mobile]" | Observable + Decidable | "No horizontal scrollbar at the 375px viewport; tap targets are at least 44 by 44 CSS pixels; the automated accessibility scan reports zero violations." |
```

Notes on the rewrites:

- The 200ms INP figure is Google's published "good" threshold: "Good INP
  values are 200 milliseconds or less", measured at the 75th percentile of
  field page loads ([web.dev, Interaction to Next Paint](https://web.dev/articles/inp)).
- The 44 by 44 CSS pixel figure is WCAG 2.1 Success Criterion 2.5.5 Target
  Size, which requires the target for pointer inputs to be "at least 44 by
  44 CSS pixels" and is a Level AAA criterion
  ([W3C WCAG 2.1, SC 2.5.5](https://www.w3.org/TR/WCAG21/#target-size)).
  A team targeting Level AA instead would substitute its own number, and
  the rubric would still pass: the heuristic requires a number, not that
  number.
- The 1.5s and the viewport list are team-chosen values.

Three vague phrases become three assertions someone can build to and
someone else can verify.

### Example 2: acceptance criteria, verdict OK

Input:

> "Acceptance criteria:
>  - Given a logged-in user with email confirmed,
>  - When they navigate to `/profile/settings`,
>  - Then the email field shows the confirmed address with a green
>    checkmark icon (`data-testid="email-confirmed-icon"`)."

Output:

```markdown
## Testability review - verdict: OK

**Artifact:** profile settings story, acceptance criteria block
**Claims found:** 1
**Untestable claims:** 0

The criterion names the actor state (logged in, email confirmed), a
specific URL, and a specific element via `data-testid`. It passes
Observable, Decidable, and Bounded. Ready to be formatted into executable
test cases.
```

An OK verdict is not a rubber stamp on the requirement. It says only that
the sentence can be tested, not that testing it is worthwhile or that the
behavior is right.

### Example 3: Bounded-only failure, verdict REVIEW

Input:

> "When a user logs in, redirect them to their last-visited page."

Output:

```markdown
## Testability review - verdict: REVIEW

**Artifact:** login redirect story, single acceptance criterion
**Claims found:** 1
**Untestable claims:** 1

| Severity | Claim | Violation | Suggested rewrite |
|----------|-------|-----------|-------------------|
| Review | "redirect them to their last-visited page" | Bounded | "After a successful login, if `localStorage.lastVisitedPath` is set AND matches `/^\\/[a-z]/` (an in-app path), redirect there. Otherwise redirect to `/dashboard`. If `lastVisitedPath` is older than 7 days, ignore it and redirect to `/dashboard`." |
```

The claim was already observable (a redirect target is inspectable) and
decidable (a URL either equals the expected value or does not). Only the
input domain was missing. Supplying it turns one ambiguous sentence into
three deterministic cases: valid recent path, absent or external path, and
stale path.

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
