# Folder sharing: we only ever test it with a colleague who is sitting there

## Problem Description

SHARE-204 rebuilds the "share this folder" dialog. Every time we test sharing,
someone types the address of the person at the next desk, it works, and we
sign it off.

Two of our last four support escalations on the old dialog were about who the
address resolved to rather than about the sharing itself. One customer's
contractor had an account on a different workspace under the same email
address, and the share landed somewhere nobody could explain. Another shared to
a colleague who had been deactivated three weeks earlier and assumed it had
gone through.

The story below is what product wrote. It says a lot about what happens when
everything is in order and very little about anything else. We want the list of
what to check before we build it, not after.

## Output Specification

1. Produce `docs/test-cases/SHARE-204.md` containing a single markdown table
   for the manual pass.
2. Each row must be a situation worth checking on its own, at a size someone
   could pick up and execute — not an individual interaction with the dialog.
3. Out of scope: automated tests, the notification email template, and the
   billing consequences of adding a guest seat.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/SHARE-204.md ===============
# SHARE-204 — Share a folder with a teammate

**Type:** Story
**Squad:** Collaboration

## Story

As a folder owner, I want to share a folder with a teammate by typing their
email address, so that they can work on its contents without me sending files
around.

## Acceptance criteria

- AC-1: The owner opens the share dialog from the folder's context menu, types
  an email address, picks an access level (viewer / commenter / editor) and
  confirms.
- AC-2: The recipient gains the chosen access level to the folder and to
  everything inside it.
- AC-3: The recipient appears in the folder's people list with their access
  level shown next to their name.
- AC-4: The owner can change or remove a person's access from the same list.

## Notes

Folders inherit access from their parent. A person who already has editor
access to a parent folder can already open this one.

Workspace admins can turn off sharing with addresses outside the workspace's
verified domains. The pilot customers have this turned on.

Only the owner of a folder can share it. Editors and viewers see the share
button but it does nothing for them today — product wants that decided as part
of this story.
