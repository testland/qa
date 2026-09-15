# Escalation review - QA-2219, written 2026-09-08

QA-2219 was filed by support.desk on 2026-07-09 from a customer call, moved to
Needs Info the same day when the developer asked which device and flow were
used, and closed by the job on 2026-07-16 as Cannot Reproduce. Nobody had
attempted a reproduction; the ticket records no attempt.

The customer's finance team re-reported it on 2026-09-03. Between the close and
the re-report, 41 duplicate charges across 9 customers, all refunded.

Two things came out of the review.

First, support.desk is a shared inbox. Nothing routes tracker comments to it and
no agent is assigned to watch it, so a question asked of support.desk is never
seen by a person. Of the 24 tickets the job has closed so far, 17 were filed by
support.desk, ci.pipeline or alerts@statuspage - accounts that cannot answer a
question at all.

Second, the comment the job posts has never appeared on any of the 24 tickets.
The tracker rejects the comment call with a 400 because the body is sent as
plain text where a structured document is required; the job does not look at
the status code and goes on to the transition. So the closures carry no
explanation, and the seven days the job waits are seven days in which nobody
was asked anything.

QA-2231 and QA-2244 are separate. Both were filed by the pipeline and both were
missing the environment and the build - which were sitting in pipeline runs
88214 and 89970 the whole time, along with the runner image and the failing job.
