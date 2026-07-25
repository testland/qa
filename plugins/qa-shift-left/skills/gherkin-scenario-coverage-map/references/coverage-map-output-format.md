# Coverage map output format

Deep reference for the `gherkin-scenario-coverage-map` skill - the full
markdown templates Step 5 emits. SKILL.md keeps the compact four-part
instruction; the filled-in shapes live here.

## Section A - Exact duplicates

List each `DUPLICATE` scenario with the existing scenario it mirrors:

```markdown
### Duplicates (do not author - already covered)

| New Scenario | Existing Scenario | File |
|---|---|---|
| "User logs in with valid credentials" | "User submits correct password" | `auth/login.feature:14` |
```

## Section B - Partial overlaps

For each `PARTIAL` scenario, list the new steps (steps not yet in the index)
and the existing steps (already covered):

```markdown
### Partial overlaps (author only the new steps)

**Scenario: "Admin resets user password"**
- Already covered steps (3): step text A, step text B, step text C
- New steps required (1): "the user receives a password-reset email"
- Recommendation: add one new step definition; reuse existing definitions
  for the 3 covered steps.
```

## Section C - Genuine gaps

List each `GAP` scenario in full, marked ready for new test authoring:

```markdown
### Gaps (author full scenario)

- "Password reset rate-limits after 5 attempts" (0 of 4 steps covered)
- "SSO login redirects to IdP" (0 of 3 steps covered)
```

## Summary header

```markdown
## Coverage map for `<story-id>` (<date>)

**New scenarios evaluated:** N
**Exact duplicates:** A (skip these)
**Partial overlaps:** B (extend step definitions only)
**Genuine gaps:** C (author full scenarios)
**Step-usage index built from:** M existing .feature files / JSON report
```
