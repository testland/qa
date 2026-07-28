# spec-testability-heuristics - worked examples

Three end-to-end reviews at each verdict level. The three heuristics, the
rubric procedure, the severity and verdict rules, the output format, and
the anti-patterns live in [SKILL.md](../SKILL.md).

## Example 1: PRD prose, verdict BLOCK

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

## Example 2: acceptance criteria, verdict OK

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

## Example 3: Bounded-only failure, verdict REVIEW

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
