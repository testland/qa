# We cannot demonstrate what "delete my account" actually did

## Problem Description

ACC-140 adds self-serve account deletion. Legal has already told us that when a
regulator or a customer asks us to demonstrate what deletion did, "the account
can no longer sign in" is not an answer we can give.

That is genuinely all our current test evidence shows. The old manual pass for
the admin-initiated version consists of deleting an account and confirming the
login page rejects it. Nobody has ever checked what happened anywhere else, and
the retention policy the deletion is supposed to honour has never been referred
to by a single test case.

Both documents are below: the story as product wrote it, and the retention
policy it has to comply with. They do not agree with each other everywhere.

## Output Specification

1. Produce `docs/test-cases/ACC-140.md` containing a single markdown table for
   the manual pass, plus any notes the reader needs.
2. The document has to be usable as evidence: someone reading a row must be
   able to see what was checked and against which written rule.
3. Out of scope: automated tests, the backup system's own restore procedure,
   and drafting the customer-facing privacy notice.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/ACC-140.md ===============
# ACC-140 — Delete my account (self-serve)

**Type:** Story
**Squad:** Identity

## Story

As a user, I want to delete my account from my settings page, so that I do not
have to email support and wait.

## Acceptance criteria

- AC-1: Settings has a "Delete my account" action. It requires the password to
  be re-entered and the word DELETE to be typed.
- AC-2: On confirmation the account is deactivated immediately and all sessions
  are signed out.
- AC-3: For 30 days the user can restore the account simply by signing in.
- AC-4: After 30 days the personal data is erased.
- AC-5: A confirmation email is sent when deletion is requested and again when
  it completes.

## Open

If the user is the sole owner of a workspace that still has other members,
product says ownership has to be transferred first. Nobody has written what the
user sees when they try.

=============== FILE: docs/policy/data-retention.md ===============
# Data retention policy (extract, v4)

- **R1.** Database backups are retained for 90 days. Deletions propagate to
  backups only as those backups expire.
- **R2.** Invoices and tax records are retained for 7 years and are exempt from
  erasure requests. They keep the legal name and billing address.
- **R3.** Every privacy action (request, restore, completion) is written to the
  privacy audit log, which is retained for 6 years and records the account
  identifier, the actor and the timestamp.
- **R4.** Sub-processors — the product analytics provider, the email provider
  and the support desk — must each be issued a deletion instruction within 30
  days of the erasure completing.
- **R5.** Content the user created inside a shared workspace belongs to the
  workspace and is reassigned to the workspace owner, not erased.
