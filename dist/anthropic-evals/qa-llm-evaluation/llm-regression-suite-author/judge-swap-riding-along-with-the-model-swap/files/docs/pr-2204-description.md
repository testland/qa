# PR #2204 — consolidate on gpt-5.4-mini

**What changes.** The assistant moves from `gpt-4.1` to `gpt-5.4-mini`, and the
model our rubric assertions are graded by moves the same way. One family, one
line on the invoice.

**Why now.** The 4.1 snapshot is on the retirement list for 2026-10-31 and we
have to move the assistant regardless. Doing the grader in the same change means
one migration instead of two.

**Cost.** Grading calls at the 4.1 rate are $2,310/mo. At the 5.4-mini rate they
are $470/mo. Saving $1,840/mo, about 20% of the platform budget.

**Quality.** Attached run on `golden-v6.1.0`, unchanged, 30 cases, no case added
or removed:

| Run                     | Pass rate |
|-------------------------|-----------|
| baseline 2026-08-30     | 0.833     |
| this PR 2026-09-11      | 0.967     |

Retained ratio 1.16 against a 0.95 gate. Comfortably green. Requesting review
from @eval-owner; I would like this in before Friday's cut.
