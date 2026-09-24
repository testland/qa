# What happened to the four failures on 20 July

The filer raised an unhandled exception on the tracker timeout and the workflow
step exited non-zero. The four failures are all in the run history - runs 90411,
90416, 90422 and 90431 - with full logs, and each of those four builds is red in
the pipeline to this day.

What was lost was not the failures. It was that nobody looked: the filing step
was configured with continue-on-error, so a red filing step did not fail the
build and no alert fired anywhere. The checkout regression sat in a red build
for nine days before anyone read it.

Nothing was changed about continue-on-error or about alerting after the review.
