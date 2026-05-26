---
component: tenant-id-propagation-tracer
type: agent
archetype: A1
---

# tenant-id-propagation-tracer — evals

Companion eval cases for [`tenant-id-propagation-tracer`](../../tenant-id-propagation-tracer.md).
Three cases cover happy path / branch / adversarial: a Django HTTP
handler with body-spoofing critical hazard (identifies the
untrusted-source pattern), an async-job listener with a different
finding category (`Lost in async hop` + DB-query-missing-filter — not
body-spoofing), and a refusal when the input scope is ambiguous (no
entry point, no file:line range, no PR diff). Re-run by feeding the
**Input** block as the first user message and checking the agent's
output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates below are the
eval-authoring date — each case is designed to be reproducible against
any tier.

## Eval 1 — happy path — Django handler, body-spoofing hazard (critical)

**Input:**

```
Trace tenant_id propagation through this Django handler. Entry point:
documents/views.py:42 — `create_document(request)`.

documents/views.py:42
    def create_document(request):
        tenant_id = request.data.get("tenant_id") or request.user.tenant_id
        title     = request.data.get("title", "")
        body      = request.data.get("body", "")
        doc = Document.objects.create(
            tenant_id = tenant_id,
            title     = title,
            body      = body,
            owner_id  = request.user.id,
        )
        cache.set(f"doc:{doc.id}", doc, timeout=300)   # cache key has no tenant prefix
        logger.info(f"Created document {doc.id}")     # log line has no tenant_id
        notify_search_index(doc.id)                    # internal call, see below
        return Response({"id": doc.id, "title": doc.title})

documents/search.py:10
    def notify_search_index(doc_id):
        # enqueues a Celery message; no tenant_id attribute
        send_to_queue("search.index", {"doc_id": doc_id})

Isolation model in this codebase: pool (shared schema, tenant_id
column on every table). RLS is configured on the `documents` table.

Please run the propagation trace and list hazards in
severity-ordered form.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Identifies the untrusted-source hazard as `[critical]` —
`request.data.get("tenant_id")` wins over `request.user.tenant_id`
because Python's `or` returns the first truthy operand, so tenant A
can create rows owned by tenant B by passing
`{"tenant_id": "<B_uuid>", ...}`. Fix: drop the body branch entirely;
use `request.user.tenant_id` only. Additionally flags
`[high]` (or `[medium]`) `Cache key collision` for `f"doc:{doc.id}"`
(no tenant prefix), `[medium]` `Logs without tenant scope` for the
`logger.info` line, and `[high]` `Lost in async hop` for the
`send_to_queue` call missing the `tenant_id` attribute. Coverage gap
section references `cross-tenant-data-leak-tests`. Isolation model
correctly labeled `pool`.

**Pass condition:** Output contains the literal string `critical` AND
mentions `request.user.tenant_id` (the named fix) AND contains one of
`body` / `request.data` / `payload` (case-insensitive, identifying the
untrusted source). Output does NOT label the handler as "safe" or
emit a hazards list with severity `none`.

## Eval 2 — branch — async job listener, different finding category

**Input:**

```
Trace tenant_id propagation through this Celery worker. Entry point:
jobs/tasks.py:20 — `process_export(message)`.

jobs/tasks.py:20
    @shared_task
    def process_export(message):
        # message attributes: { "tenant_id": "...", "resource_id": "..." }
        tenant_id   = message["tenant_id"]
        resource_id = message["resource_id"]
        report = Report.objects.get(id=resource_id)
        rows   = Row.objects.filter(report_id=resource_id).values()
        path   = f"/tmp/exports/{resource_id}.csv"
        with open(path, "w") as f:
            csv.writer(f).writerows(rows)
        upload_to_s3(path, bucket="exports", key=f"reports/{resource_id}.csv")
        logger.info(f"Exported report {resource_id} to s3", extra={"tenant_id": tenant_id})
        return {"status": "ok", "rows": len(rows)}

Isolation model in this codebase: pool (shared schema, tenant_id
column on every table). RLS is NOT configured on `report` or `row`
tables in this codebase.

The enqueuer for this task is documented separately — it does not
verify the requester's tenant before enqueueing the resource_id +
tenant_id pair.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Different finding category from Eval 1 — the hazard
here is `Lost in async hop` upgraded to a downstream `Untrusted
source` because `message["tenant_id"]` is taken at face value and the
enqueuer doesn't verify it against the requester. The correct fix per
the agent's documented async-job rule: load the resource by id first,
then derive `tenant_id = resource.tenant_id`; verify against the
enqueuing request's tenant. Additionally flags `[high]` (or `[medium]`
if RLS were configured, but it explicitly isn't) DB-query-missing-
filter on `Report.objects.get(id=...)` and `Row.objects.filter(report_id=...)`
— no `tenant_id` filter, RLS not configured. The hazards table does
NOT focus on HTTP body-spoofing terminology (different category).

**Pass condition:** Output contains one of `async` / `message` /
`queue` / `enqueuer` (case-insensitive) AND mentions one of
`resource.tenant_id` / `derive` / `reload` (the named fix) AND
mentions `Report` or `Row` (the DB queries flagged). Output does NOT
characterize the controlling hazard as `request.body` /
`request.data` / `HTTP body` (wrong entry-type category).

## Eval 3 — adversarial — ambiguous scope, refuse to trace

**Input:**

```
Please trace tenant_id propagation in our codebase.

That's the full request. We didn't specify a handler, function, file,
line range, or PR diff. We don't have an entry point in mind — just
do a general trace and tell us what's wrong.

(We have ~150 endpoints across ~30 Django apps and ~40 Celery tasks.)
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to produce a propagation trace. The agent's
"When invoked" line specifies the required input: "a handler/function
name, a file + line range, or a PR diff scoping the trace." None of
those are supplied. The agent's documented limitation "Single path at
a time. This agent traces one entry point; it does not enumerate all
entry points." is the controlling rule — for full-PR review the
hand-off is `tenant-leak-critic`. Output should ask for / list the
specific missing inputs (entry-point identifier OR file:line range OR
PR diff) and recommend `tenant-leak-critic` for the broad
"everything in the codebase" scope. Does NOT emit a propagation trace
or hazards table for an unspecified entry point.

**Pass condition:** Output contains one of `entry point` / `entry` /
`handler` / `scope` / `missing` (case-insensitive) in the context of
the underspecified input AND mentions `tenant-leak-critic` (the named
hand-off for full-PR review). Output does NOT contain a
`Propagation trace` section listing concrete `file:line` steps for a
specific function.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — the eval
  embeds the relevant source snippets so reviewers do not need to
  clone a Django + Celery sandbox to reproduce; the
  classification / hazard-severity / fix-mapping logic is what is
  under test.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (`request.user.tenant_id`,
  `resource.tenant_id`, `tenant-leak-critic`, `critical`, etc.).
- The agent's tool surface (`Read`, `Grep`, `Glob`,
  `Bash(git diff *)`, `Bash(git log *)`) is read-only — eval re-runs
  cannot modify the codebase or alter the production code paths
  under inspection.
