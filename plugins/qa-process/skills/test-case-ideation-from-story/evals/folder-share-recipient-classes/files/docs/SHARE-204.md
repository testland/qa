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
