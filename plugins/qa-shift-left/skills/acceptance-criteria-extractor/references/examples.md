# acceptance-criteria-extractor - worked examples

Three end-to-end examples of story text turned into acceptance criteria.
The core procedure (Steps 1-6), the output templates, and the anti-pattern
catalog live in [SKILL.md](../SKILL.md).

## Example 1: simple story -> 2 scenarios

Input (Linear story):

> "Title: Email update on profile page
>
> As a logged-in user, I want to update my email address from
> `/profile/settings`. After update, the email field shows the new
> value and I see a confirmation toast."

Output:

```gherkin
Feature: Email update on profile page

  As a logged-in user
  I want to update my email address from /profile/settings
  So that my account contact information stays current

  Background:
    Given a logged-in user with email confirmed
    And the user is on the /profile/settings page

  Scenario: Update email to a new valid address
    When the user changes the email field to "new@example.com"
    And the user clicks "Save profile"
    Then the email field shows "new@example.com"
    And a [data-testid="profile-saved-toast"] is visible

  Scenario Outline: Email update validation rejects invalid input
    When the user changes the email field to "<invalid_email>"
    And the user clicks "Save profile"
    Then the email field shows the previous value
    And a [data-testid="email-validation-error"] is visible

    Examples:
      | invalid_email           |
      | not-an-email            |
      | missing@                |
      | @example.com            |
      | spaces in@email.com     |
```

## Example 2: PRD with implicit preconditions

Input (PRD excerpt):

> "We will allow promo codes at checkout. Codes apply 20% off the
> subtotal."

Output:

```markdown
## Implicit-precondition flags (3)

1. **Code source.** Where do codes come from - user-entered? auto-applied? Both?
2. **Eligibility.** Are codes user-tier specific (e.g. only new users)?
   Time-limited? Per-user limited?
3. **Subtotal definition.** Subtotal *before* tax / shipping, or *after*?

Without these answers, the test suite cannot be written.
```

The agent refuses to fabricate the missing pieces - instead returns a
question list to the PRD author.

## Example 3: Scenario Outline opportunity

Input:

> "Login should work for active accounts (returning 200) but reject
> suspended (401), unverified (403), and non-existent (404) accounts."

Output:

```gherkin
Feature: Login authorization

  Scenario Outline: Login response per account status
    Given an account with status "<status>"
    When the user submits valid credentials
    Then the response status is <http_status>
    And the response body contains "<error_code>"

    Examples:
      | status        | http_status | error_code           |
      | active        | 200         |                       |
      | suspended     | 401         | ACCOUNT_SUSPENDED    |
      | not_verified  | 403         | EMAIL_NOT_VERIFIED   |
      | not_found     | 404         | ACCOUNT_NOT_FOUND    |
```
