# Runbook: nightly-api

Owner: Dana Okonkwo (left 2026-05). No current owner.
Last edited 2026-02-19.

## What it does

Every night at 03:00 UTC the job reads the API document the service publishes,
generates 300 cases for each operation in it, and fires them at staging with
four workers.

## What it validates

Five validations run against every response:

| Validation              | Fires when                                              |
|-------------------------|---------------------------------------------------------|
| status code conformance | the response status is not one the document lists        |
| response schema conformance | the response body does not match the documented schema |
| content type conformance| the `Content-Type` is not one the document lists          |
| response header conformance | a documented response header is missing or malformed  |
| server error detection  | the response is in the 5xx range                          |

The last two columns of the JUnit report tell you which validation failed and
give you the exact request to reproduce it with.

## If it goes red

Open the artifact, find the reproduction command, run it against staging. If it
reproduces, raise a ticket against the owning team. Do not disable the job.
