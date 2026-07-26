# The seven tours in full

Deep reference for `exploratory-tours-reference` SKILL.md. Consult when the
compact table in the skill isn't enough and you want each tour's full mission,
signal, worked example, and when-to-use guidance.

## Tour 1 - Feature tour

**Mission:** Visit every feature in scope at depth = 1.

**Signal:** "Does the feature exist? Does it open without an error?
Does its primary affordance work?"

**Example application:**

```markdown
**Charter:** Explore the dashboard.
**Feature tour:**
1. Open the dashboard. Pass.
2. Click "Notifications" → notification panel opens. Pass.
3. Click "Settings" → settings page loads. Pass.
4. Click "Reports" → 404. **FAIL** - investigate.
```

**When to use:** New feature; post-deploy smoke; feature-coverage
gap survey.

**When NOT to use:** Deep-dive sessions where the depth-1 sweep
provides no signal.

## Tour 2 - Money tour

**Mission:** Find every place money / pricing / currency / discount
appears; verify each.

**Signal:** Rounding errors, currency conversion drift,
discount-stacking bugs, free-shipping edge cases, locale-specific
formatting (€1.234,56 vs $1,234.56).

**Example application:**

```markdown
**Charter:** Explore promo code application.
**Money tour:**
1. Apply 10% off promo to a $24.99 cart. Verify subtotal = $22.49.
2. Apply 50% off promo to a $0.01 cart. Verify subtotal = $0.01 (rounding).
3. Apply 100% off promo to a free-shipping order. Verify shipping handling.
4. Apply two stackable promos. Verify the order of operations.
5. Apply a promo + state tax. Verify tax base.
```

**When to use:** Any feature touching money, pricing, billing.
**Critical for:** Checkout, billing, subscription management.

## Tour 3 - Landmark tour

**Mission:** Visit each "landmark" feature - the canonical user
journeys / hero flows.

**Signal:** Whether the marquee features still work after a
refactor; baseline confidence.

**Example application:**

```markdown
**Charter:** Verify post-refactor regression risks.
**Landmark tour:**
1. Sign up new account → confirm email → log in. **Hero flow.**
2. Add to cart → checkout → confirmation. **Hero flow.**
3. Cancel subscription → reactivate. **Hero flow.**
```

**When to use:** Post-refactor verification; pre-release smoke;
quarterly health check.

**When NOT to use:** When the team already has automated tests for
hero flows (those should run first; tour confirms behavior the
automation doesn't catch).

## Tour 4 - Intellectual tour

**Mission:** Explore the hardest-to-understand parts of the
product. The features that the team has trouble explaining.

**Signal:** Bugs in genuinely complex business logic where edge
cases lurk.

**Example application:**

```markdown
**Charter:** Explore the tax calculator's nexus rules.
**Intellectual tour:**
1. Order ships from CA to OR (no sales tax in OR). Verify tax = 0.
2. Order ships from CA to TX (Texas nexus). Verify TX tax applied.
3. Order ships from CA to NY (origin-based vs destination-based). Verify rule.
4. Order with mixed-tax-rate items. Verify per-item rate application.
5. Subscription order spanning a tax-rate change date. Verify proration.
```

**When to use:** Complex business logic (tax, billing,
permissioning, scheduling).

**Effort:** High. This tour requires the tester to understand the
domain - pair with a domain-expert "guide."

## Tour 5 - Bad-data tour

**Mission:** Feed pathological inputs and observe behavior.

**Signal:** Input validation bugs, error-handling gaps, security
vulnerabilities, locale parsing issues.

**Example application:**

```markdown
**Charter:** Stress-test the search input.
**Bad-data tour:**
1. Empty input. Verify behavior.
2. Single space. Verify trimming or rejection.
3. 5000-character input. Verify truncation or rejection.
4. SQL injection: `'; DROP TABLE users; --`. Verify escaping.
5. XSS: `<script>alert(1)</script>`. Verify sanitization.
6. Unicode bidi override (RLO): `‮`. Verify handling.
7. Right-to-left text: `مرحبا`. Verify rendering.
8. Emoji + ZWJ sequences: `👨‍👩‍👧‍👦`. Verify counting.
9. Null byte: `foo\0bar`. Verify handling.
```

Pair with `malicious-payload-bank` for the canonical payloads
(OWASP Top 10 + CWE Top 25).

**When to use:** Any input field (search, forms, URL params, file
upload).

## Tour 6 - Configuration tour

**Mission:** Vary the user's / system's configuration; observe
behavior changes.

**Signal:** Config-dependent bugs (feature flags off vs on, dark
mode vs light, locale variations, browser variations).

**Example application:**

```markdown
**Charter:** Verify checkout works under all account configurations.
**Configuration tour:**
1. New user, no payment method. Verify "add payment" prompt.
2. Existing user, expired card. Verify "update card" prompt.
3. EU user, GDPR consent banner active. Verify checkout flow.
4. Beta user with experiment flag `new-checkout=true`. Verify variant.
5. Admin impersonating a user. Verify behavior.
```

**When to use:** Multi-tenant / multi-config products; before
toggling a major feature flag.

Pair with `feature-flag-test-harness` for the matrix-shard approach
to flag-combination testing.

## Tour 7 - Garbage collector's tour

**Mission:** Visit every page / endpoint once. Don't deeply test;
just confirm presence.

**Signal:** Dead links, 404s, stale routes, removed-feature
breadcrumbs.

**Example application:**

```markdown
**Charter:** Pre-release sanity check.
**Garbage collector's tour:**
1. Walk through every nav item; confirm each loads.
2. Visit every footer link; confirm each loads.
3. Visit every URL listed in the sitemap; flag 404s.
4. Visit every documentation link from the in-app help.
```

**When to use:** Before a release; after a major refactor; periodic
health check.

**When NOT to use:** Replacing automated link-checking - the
garbage collector's tour is for **rendering** issues an automated
checker can't catch.
