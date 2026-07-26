---
name: uat-script-author
description: "Emits User Acceptance Testing scripts in stakeholder-readable format - pre-conditions / business-language steps / expected business outcome / pass-fail / sign-off. Tailored for non-developer testers (end users, SMEs, solution owners) per the UAT canonical definition. Output is one TC per stakeholder-meaningful scenario with explicit sign-off, suitable for compliance / contract / audit records. Use when a release requires formal UAT before sign-off - typical for B2B contracts, regulated industries, or any delivery where the customer's acceptance is the contractual gate."
---

# uat-script-author

## Overview

[uat]: https://en.wikipedia.org/wiki/Acceptance_testing

UAT scripts are written for **stakeholders, not developers**: the end
user, subject-matter expert (SME), or solution owner runs the script in
business language, and the success criterion is "this works for the
business," not "no exceptions thrown." Sign-off is a contractual
artifact - upon meeting the acceptance criteria the stakeholder signs
off, confirming the product meets defined requirements ([uat-wiki][uat]).
This skill emits those scripts.

## When to use

- A release requires formal UAT - B2B contracts, regulated
  industries (finance, healthcare, gov), enterprise SaaS.
- A new feature needs business sign-off before launch.
- A vendor contract requires "customer acceptance" as the
  payment trigger.
- A migration / rebuild needs the customer to confirm "yes, this
  is what we wanted" before old system shutdown.

If the test is technical (verify HTTP 200, validate schema), see
`manual-test-script-author` - that's the developer-facing format.

## Step 1 - Identify the user journey

Per [uat-wiki][uat]:

> "UAT should be executed against test scenarios representing user
> journeys rather than technical click-by-click steps."

A UAT script covers **one user journey end-to-end**, not a single
button-click. The journey is what the business stakeholder agreed
to in the contract / SOW / acceptance criteria.

Examples:

- "A new customer signs up, places a first order, and receives
  confirmation."
- "An existing customer updates their billing address and the
  invoice reflects the change next billing cycle."
- "An admin creates a new user, assigns roles, and the user can
  log in with the assigned permissions."

Per [uat-wiki][uat], select the "three most common or difficult
tasks users will perform" - UAT depth, not breadth.

## Step 2 - Format

```markdown
# UAT-001 - New customer first-order flow

**Customer / Stakeholder:** ____________________
**Tester:** ____________________   **Date:** ____________________
**Environment:** UAT   **Build / Version:** v1.4.5

## Business context

This script verifies that a new prospective customer can complete
the full sign-up + first-order journey end-to-end, including
account creation, email confirmation, browsing the catalog, adding
items to cart, completing checkout, and receiving confirmation.

This corresponds to acceptance criterion **AC-1** in the SOW.

## Pre-conditions

- [ ] Test environment is at build `v1.4.5` (verified by tester).
- [ ] Tester has not previously created an account on this UAT
      environment.
- [ ] Test payment method is available: Stripe test card
      4242 4242 4242 4242, any expiry, any CVC.
- [ ] Tester has access to email inbox for `<email>@example.com`.

## Steps

| Step | Action                                                           | Expected outcome                                                        | Pass | Fail | Notes |
|------|------------------------------------------------------------------|-------------------------------------------------------------------------|:----:|:----:|-------|
| 1    | Open `https://uat.example.com/`. Click "Sign up".                  | Sign-up form appears.                                                    |      |      |       |
| 2    | Enter email `uat-001-<initials>@example.com`, set password.        | "Verify your email" prompt appears.                                      |      |      |       |
| 3    | Open the email inbox; click the verification link.                 | Browser opens to dashboard; greeting shows the user's name.              |      |      |       |
| 4    | Browse the catalog. Search for "BOOK-001".                         | Product page loads showing the item details and "Add to cart" button.   |      |      |       |
| 5    | Click "Add to cart". Click the cart icon.                          | Cart page shows "BOOK-001" qty 1, $24.99.                                 |      |      |       |
| 6    | Click "Checkout". Enter shipping address.                          | Order summary shows shipping cost; tax computed per address.             |      |      |       |
| 7    | Enter payment details (test card 4242…). Click "Place order".      | Confirmation page shows order ID; total matches step 6.                  |      |      |       |
| 8    | Open email inbox; verify confirmation email arrives within 5 min.  | Email shows order ID, items, total, expected delivery date.              |      |      |       |

## Acceptance criteria verification

| AC ID  | Description                                                | Verified in step | Pass / fail |
|--------|------------------------------------------------------------|------------------|:-----------:|
| AC-1.1 | New customer can sign up                                    | 1, 2, 3          |             |
| AC-1.2 | New customer can browse the catalog                         | 4                |             |
| AC-1.3 | New customer can add items to cart                          | 5                |             |
| AC-1.4 | New customer can complete checkout                          | 6, 7             |             |
| AC-1.5 | New customer receives order confirmation                    | 8                |             |

## Sign-off

**Tester:** ____________________  **Date:** ____________________

**Customer / Stakeholder:** ____________________  **Date:** ____________________

By signing, the stakeholder confirms that the system meets
acceptance criteria AC-1.1 through AC-1.5 as defined in the
Statement of Work, dated YYYY-MM-DD.

## Defects raised

| Bug ID | Step | Severity | Description |
|--------|------|----------|-------------|
|        |      |          |             |
```

## Step 3 - Business language, not implementation

UAT scripts are read by stakeholders who don't speak HTTP / DB /
React. Translate:

| Implementation language          | Business language                          |
|----------------------------------|--------------------------------------------|
| `POST /orders` returns 201        | The order is placed and the system shows a confirmation. |
| `cart.items.length === 1`         | The cart shows the item.                    |
| `email.subject === 'Order confirmation'` | An order confirmation email arrives. |
| `auth_token` is set in the cookie | The user is logged in.                      |
| `INSERT INTO users` succeeded     | The account is created.                     |

The script is about **outcomes**, not **mechanisms**.

## Step 4 - Three-tasks rule

Per [uat-wiki][uat]: "the three most common or difficult tasks
users will perform" - UAT covers depth, not breadth.

A UAT round shouldn't have 50 scripts. The pattern:

- 5-10 scripts covering the **three most common** user journeys.
- 2-5 scripts covering the **two or three most difficult** tasks
  (the ones that go wrong most often in the team's history).

If the contract has 30 acceptance criteria, group them into ~10
journeys; one script per journey.

## Step 5 - Run the round, log defects, re-test

Execute each script with the stakeholder. For every failed step, log a
defect in the "Defects raised" table (Step 2 format) with its step and
severity. Verify: every row in the acceptance-criteria table must read
pass before sign-off; if any AC fails, hand the defects to the team, fix
them, and re-run the affected scripts. Repeat until all acceptance
criteria pass - do not proceed to sign-off with an open failing AC.

## Step 6 - Sign-off as artifact

The signed UAT scripts go into the customer record:

- Hard-copy file (paper-signed for legal records).
- Soft-copy in the team's contract management system.
- PR comment in the team's repo (referencing the signed PDF).

The sign-off date triggers the contractual milestone (payment,
go-live authorization, vendor approval).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Implementation-language steps                                         | Stakeholder can't follow.                                                 | Translate to business language (Step 3). |
| 50 UAT scripts                                                         | Stakeholder won't run them all; rubber-stamp result.                     | 5-10 + 2-5 difficult (Step 4). |
| Steps without expected outcomes                                        | Stakeholder doesn't know what "success" means; subjective sign-off.      | Every step has an expected outcome (Step 2). |
| No acceptance criteria mapping                                          | Sign-off doesn't tie back to contract; legal exposure.                    | AC verification table (Step 2). |
| Script that mixes positive and negative cases                          | Stakeholder confused; sign-off ambiguous.                                 | Positive cases only in UAT; negative cases via QA's regression suite. |
| Asking the developer to run UAT                                        | Defeats the purpose; per [uat-wiki][uat] the end user / SME runs it.    | Hand to the right person. |
| Skipping sign-off ("we'll do it later")                                | Contract milestone slips; payment delayed; trust eroded.                  | Hard-stop the release without signed scripts. |

## Limitations

- **Stakeholder availability.** UAT requires the customer's time;
  scheduling is the rate-limiter.
- **Soft acceptance.** Stakeholders may sign off without thoroughly
  testing; the script's structure helps but doesn't enforce.
- **No automation parity.** UAT explicitly tests the user
  experience; automated tests of the same steps don't substitute.
- **Per-customer customization.** B2B UAT often requires
  customer-specific scripts (their data, their workflows). Scale
  by tenancy, not by template.

## References

- [uat-wiki][uat] - User acceptance testing definition: who runs
  it (end user / SME / solution owner), purpose (sign-off as
  contractual artifact), format (user journeys, not technical
  click-steps), three-most-common-or-difficult-tasks rule.
- `manual-test-script-author` - sibling: developer-facing format.
- `acceptance-criteria-extractor` (in the qa-shift-left plugin) - upstream: emits the ACs this skill turns into UAT scripts.
