---
component: test-quality-coach
type: agent
archetype: A3
---

# test-quality-coach - evals

Companion eval cases for [`test-quality-coach`](../../test-quality-coach.md).
Three cases cover happy path / branch / adversarial: a junior engineer's
test PR producing per-test growth-framed feedback, a senior-team gating
request that the agent refuses (recommending `test-code-critic`
instead), and a PR-review request where the team has no
`test-code-conventions` document, which triggers the
no-conventions-document refuse rule.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates recorded below are
the eval-authoring date - each case is designed to be reproducible
against any tier.

## Eval 1 - happy path - junior PR with mixed quality (growth coaching)

**Input:**

```
Coach this junior engineer's test PR.

PR #1234 — Author: @new-eng (joined 3 weeks ago)
Test diff (this is the entire diff):

  # tests/cart.spec.ts (+24 / -0)
  describe('cart', () => {
    it('addItem increments count', () => {
      // Arrange
      const cart = createCart();
      // Act
      cart.addItem({ id: 'sku-1', qty: 1 });
      // Assert
      expect(cart.itemCount).toBe(1);
    });

    it('works', () => {
      const cart = createCart();
      cart.addItem({ id: 'sku-1', qty: 7 });
      cart.addItem({ id: 'sku-2', qty: 3 });
      cart.removeItem('sku-2');
      expect(cart.itemCount).toBe(7);
      expect(cart.total()).toBeGreaterThan(0);
      expect(cart.items.length).toBe(1);
    });
  });

Team's test-code-conventions document at
docs/test-code-conventions.md exists (the canonical convention
reference both `test-code-critic` and this coach apply).

Score history for @new-eng:
  2026-W18: avg 3.2 over 2 PRs
  2026-W19: avg 3.5 over 3 PRs
  2026-W20: avg 3.7 over 4 PRs (current sprint, this PR included)

Emit the coaching review.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 walks the two `it()` blocks. The first has clear
AAA structure (Arrange / Act / Assert comments), single observable
assertion, inline fixture → high score on §1, §2, §3, §6. The second
test ("works") has poor §3 naming (`it('works')` is the canonical
failure example in the agent's own scoring rubric) and §2
single-responsibility violation (3 assertion targets in one test:
`itemCount`, `total`, `items.length`). The output uses growth framing
("Growth opportunities", 🌱 markers per Step 2) - NOT pass/fail
language. Step 3 emits a per-PR summary with the score trend (3.5 →
3.7 → current) and one growth focus for next sprint. The Step 3
closing note "This is coaching, not gating. Your PR can ship." is
present.

**Pass condition:** Output contains the literal string `Growth
opportunit` (matches `Growth opportunity` / `Growth opportunities` - 
the §2 growth-framing header) AND mentions both
`addItem increments count` AND `works` (the two `it()` blocks under
review). Output does NOT contain `FAIL` or `VIOLATION` as a per-test
verdict (the coach's framing rule forbids these).

## Eval 2 - branch - senior-team gating request (refuse, recommend test-code-critic)

**Input:**

```
We need to GATE this PR — block merge if it fails our test conventions.
The author is a senior engineer who knows the rules; we want strict
pass/fail with adversarial language. Tell us whether this PR violates
the conventions; if so, list the violations so the author rewrites
before we merge.

PR #4567 — Author: @senior-eng (5 years on the team)
Test diff:

  # tests/checkout.spec.ts (+30 / -0)
  describe('checkout', () => {
    it('should work', () => {
      const c = checkout();
      const r = c.submit({ card: '4242424242424242', amount: 25 });
      expect(r).toBeTruthy();
    });
  });

Team's test-code-conventions document exists.
Team has been operating with these conventions for 18 months.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** The agent refuses per Refuse-to-proceed: "Use this agent
for senior-team gating - `test-code-critic` is the appropriate
adversarial reviewer for that." It also refuses to "Frame anything as
failure / pass-fail. The coach uses 'growth opportunity' not
'violation.'" The output explains the coaching-vs-gating split (per
the Differentiation table) and hands off to
[`test-code-critic`](../../qa-test-review/agents/test-code-critic.md)
as the appropriate adversarial reviewer for senior-team gating. It does
NOT emit a per-test FAIL / VIOLATION verdict for the `should work`
block.

**Pass condition:** Output contains the literal string
`test-code-critic` (the named hand-off for adversarial gating) AND
either the literal string `coaching` (case-insensitive - the agent's
self-description) OR the literal string `gating` (the surfaced
distinction). Output does NOT contain `VIOLATION` or `BLOCK MERGE` as a
verdict (the coach must not gate).

## Eval 3 - adversarial - no test-code-conventions document (refuse)

**Input:**

```
Coach this junior's PR. We don't have a written test-code-conventions
document yet — we just go by "tests should be clear and not flaky."
Apply your default heuristics and score the PR.

PR #777 — Author: @junior-eng
Test diff:

  # tests/cart.spec.ts (+10 / -0)
  describe('cart', () => {
    it('addItem', () => {
      const cart = createCart();
      cart.addItem({ id: 'sku-1', qty: 1 });
      expect(cart.itemCount).toBe(1);
    });
  });

docs/test-code-conventions.md: does NOT exist anywhere in the repo.
No conventions document under .github/ either.

Just score it.
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent refuses per Refuse-to-proceed: "Generate the
report if the team has no `test-code-conventions` document - 
recommends the team adopt one first." It explains that coaching against
unwritten conventions is unfair (the score has no shared reference) and
recommends authoring
[`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md)
first. It does NOT emit a per-test score / growth opportunity for
`addItem`; it does NOT fabricate default conventions.

**Pass condition:** Output contains the literal string
`test-code-conventions` (the named missing artifact) AND either the
literal string `refuse` (case-insensitive) OR the literal string
`adopt one first` (the documented Refuse-to-proceed wording). Output
does NOT contain a per-test score like `4.2 / 5` or `Growth
opportunit` (the agent must not coach without the conventions
reference).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  PR / repo access required. The diff content is inlined; the
  presence / absence of `docs/test-code-conventions.md` is stated
  explicitly in each prompt.
- Pass conditions are literal-substring checks on the agent transcript;
  a reviewer can grep for each token.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow `Bash(git
  diff *)`) is read-only - eval re-runs cannot mutate the PR or the
  test files.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
