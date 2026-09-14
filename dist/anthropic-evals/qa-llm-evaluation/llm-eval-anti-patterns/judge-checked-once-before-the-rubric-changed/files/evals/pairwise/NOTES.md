# Harness notes, Dan

`run.mjs` takes the production reply as the baseline and the new prompt's reply
as the candidate, and alternates which of the two goes into the `Response 1`
slot, so neither variant sits in the same position for a whole run. We used to
run it with a fixed order and stopped. `tallyBySlot` reports the split and
September came out 31 / 30, which is as even as it is going to get.

The grader is set once, in `promptfooconfig.yaml` under
`defaultTest.options.provider`, precisely so that nobody ends up inheriting a
default without noticing. We picked the larger model on the grounds that you
should not grade with something weaker than the thing you are grading.

Priya asked in September why the grading spend on this run was so much smaller
than she had budgeted for. I told her the September run was shorter than the
June one. I have not actually gone back and checked that.

The other item on my list is moving grading off our own vendor, and the
candidate is `anthropic:claude-sonnet-4-6`. I have not done it because that
identifier has no date in it, and everything I have read about model
identifiers says a string without a date is a pointer that can be moved under
you. I would want the dated form before I put it in the config and I have not
managed to find one.
