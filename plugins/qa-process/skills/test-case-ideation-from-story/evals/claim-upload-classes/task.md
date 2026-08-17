# Evidence upload spec is mostly a list of file formats

## Problem Description

CLM-512 lets a policyholder attach evidence to a claim. The spec is short and
most of it is the list of accepted formats, so the test list we got back last
time was six rows long: one per format, each saying the file uploads.

That list ran green for two releases while a renamed executable sailed through
the type check, a 0-byte file created an attachment row with nothing behind it,
and the eleventh file on a claim replaced the first instead of being refused.

The claims team runs a short confidence pass on this screen at every release
and a fuller pass weekly, and they need to know which rows belong to which.
They will not review more than about sixteen rows, so the budget is real:
anything that does not buy coverage is taking the place of something that
would.

## Output Specification

1. Produce `docs/test-cases/CLM-512.md` containing a single markdown table.
2. Keep it to roughly sixteen rows. A reviewer must be able to tell which rows
   are for the per-release confidence pass and which are not.
3. Out of scope: automated tests, the virus-scanner vendor's own behaviour, and
   the claims adjuster's review screen.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/CLM-512.md ===============
# CLM-512 — Attach evidence to a claim

**Type:** Story
**Squad:** Claims intake

## Story

As a policyholder, I want to attach photographs and documents to my open claim,
so that the adjuster does not have to email me for them.

## Acceptance criteria

- AC-1: Accepted formats are PDF, JPG, PNG, HEIC, DOCX and XLSX.
- AC-2: Each file may be up to 25 MB.
- AC-3: A claim may carry at most 10 attachments.
- AC-4: Files are scanned for malware after upload. Until the scan finishes the
  attachment shows as "pending"; if the scan fails the attachment is removed
  and the policyholder is told.
- AC-5: The attachment list shows the file name, size and upload time.
- AC-6: Attachments can only be added while the claim is in state `open`.

## Notes

File names are stored as given, up to 200 characters. The mobile app uploads
HEIC straight from the camera roll; the web app converts on the client.

Uploads happen over a single request per file. A dropped connection mid-upload
leaves nothing behind — that is the intended behaviour but has never been
verified.
