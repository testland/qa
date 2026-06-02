---
component: crash-stack-trace-analyzer
type: agent
archetype: A1
---

# crash-stack-trace-analyzer - evals

Companion eval cases for [`crash-stack-trace-analyzer`](../../crash-stack-trace-analyzer.md).
Three cases cover happy path / branch / adversarial: a V8 trace with a clear
regression (hypothesis (a)), a Python traceback whose blame points at an old
long-standing frame (hypothesis (b)), and a minified JavaScript stack with
no sourcemap (must refuse to localize). Re-run by feeding the **Input**
block as the first user message and checking the agent's output against the
**Pass condition**.

## Eval 1 - happy path - V8 trace, clear regression (hypothesis (a))

**Input:**

```
Production crash, last 10 minutes, ~40 sessions affected. Here is the
stack trace, copied verbatim from Sentry:

  TypeError: Cannot read properties of undefined (reading 'amount')
      at calculateTotal (src/checkout/total.ts:23:18)
      at handleCheckoutSubmit (src/checkout/handlers.ts:88:14)
      at HTMLButtonElement.onClick (src/checkout/page.tsx:112:9)
      at Object.<anonymous> (node_modules/react-dom/cjs/react-dom.production.min.js:54:317)

Repo: monorepo with src/checkout/ as a workspace. git blame is available.

Assume git blame on src/checkout/total.ts line 23 returns:
  abc1234 (pat 2026-04-30 16:21:04 +0000 23) const tax = order.items[0].amount * 0.08;

And git log abc1234 --oneline -1 returns:
  abc1234 feat(checkout): apply jurisdiction-aware tax on cart total
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 identifies the trace format as V8. Step 2 picks
`calculateTotal (src/checkout/total.ts:23:18)` as the top application frame
(react-dom internal is skipped per the frame-skip heuristic). Step 3
resolves the source line to `const tax = order.items[0].amount * 0.08;`.
Step 4 reports the blame for `abc1234` with author `pat` and the commit
subject `feat(checkout): apply jurisdiction-aware tax on cart total`. Step
5 classifies the hypothesis as **(a) clear regression** - the implicated
commit introduced the unguarded `items[0]` access. Step 6 recommends
`git show abc1234` and hand-off to `bug-repro-builder` to write an
empty-cart failing test.

**Pass condition:** Output contains the literal string `abc1234` AND
mentions `bug-repro-builder` AND classifies the hypothesis with the
substring `(a)` (case-sensitive). Output does NOT recommend
`regression-bisector` (that is the hypothesis (b) hand-off, not the
(a) one).

## Eval 2 - branch - Python traceback, hypothesis (b) (long-standing fault)

**Input:**

```
We started seeing this Python crash this week after rolling out Python
3.12 to our worker pool. The code itself hasn't changed in 14 months.

  Traceback (most recent call last):
    File "src/etl/transform.py", line 67, in transform_row
      normalized = _normalize_unicode(value)
    File "src/etl/transform.py", line 142, in _normalize_unicode
      return value.encode('utf-8').decode('ascii')
  UnicodeDecodeError: 'ascii' codec can't decode byte 0xe2 in position 4: ordinal not in range(128)

Assume git blame on src/etl/transform.py line 142 returns:
  d4e5f60 (alex 2024-12-03 11:02:18 +0000 142)     return value.encode('utf-8').decode('ascii')

git log d4e5f60 --oneline -1:
  d4e5f60 chore(etl): normalize unicode to ascii for legacy downstream

The Python 3.12 rollout commit was abc9999 last week.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 identifies the trace format as Python. Step 2 picks
`_normalize_unicode (transform.py:142)` as the top application frame
(`transform_row` calls it; the deepest frame is the localizing one). Step
3 resolves the source line to the `.encode('utf-8').decode('ascii')` call.
Step 4 reports blame for `d4e5f60` from 2024-12-03 - over a year old. Step
5 classifies the hypothesis as **(b) long-standing fault exposed by an
environmental change** (the Python 3.12 rollout last week, not the
14-month-old code), and recommends re-blaming on the parent or using
`regression-bisector` to bisect the worker-pool deployment between the
Python 3.11 build and the Python 3.12 build.

**Pass condition:** Output classifies the hypothesis with the substring
`(b)` (case-sensitive) AND mentions `regression-bisector`. Output does NOT
classify the hypothesis as `(a)` (the 14-month-old code is not the
regression - the environment change is).

## Eval 3 - adversarial - minified JavaScript, no sourcemap (must refuse)

**Input:**

```
Production crash from a customer in Safari 17, reported via the in-app
feedback widget. Only the stack trace was captured:

  TypeError: t is undefined
      at a (https://cdn.example.com/app.0a1b2c.js:1:48217)
      at o (https://cdn.example.com/app.0a1b2c.js:1:51092)
      at HTMLButtonElement.<anonymous> (https://cdn.example.com/app.0a1b2c.js:1:62880)

We checked the CDN: app.0a1b2c.js has no sibling app.0a1b2c.js.map. The
build pipeline does not currently publish sourcemaps to the CDN.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 1 identifies the trace format as minified browser
DevTools / V8 over HTTP URLs. Step 3 attempts sourcemap resolution and
finds no sibling `.map` file. Per the frame-skip heuristics table
(`<unknown> minified without sourcemap` → "Cannot localize; flag and
stop"), the agent halts. Hypothesis is **(c) inconclusive - needs more
data**. The recommended next step is to publish sourcemaps to the CDN
(or to the error-monitoring vendor) and re-run the analysis once they
are available. The agent does NOT emit a blame table or a commit SHA
guess - there is no way to localize without the sourcemap, and guessing
would defeat the purpose of the analysis.

**Pass condition:** Output classifies the hypothesis with the substring
`(c)` (case-sensitive) AND contains the substring `sourcemap` (case-
insensitive). Output does NOT contain a `git blame` table with commit
SHAs claiming to localize the bug; does NOT classify the hypothesis as
`(a)` or `(b)`.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a repo. Blame / log output is included
  inline so the eval is self-contained.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
