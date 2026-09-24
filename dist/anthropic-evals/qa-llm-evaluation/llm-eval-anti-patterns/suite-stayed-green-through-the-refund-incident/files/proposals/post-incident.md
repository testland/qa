# INC-4471, what I want to do, Dan, 2026-09-04

**1. Raise the similarity threshold from 0.80 to 0.92.** The reply we sent was
word-for-word fine, which is why it scored well — the wording was never the
problem. I went back through the June calibration samples and 0.92 sits above
where our acceptable replies land, so it is a tight setting that our good
replies clear and this one would not have. Two lines of config, done today.

**2. Buy SupportQA-2k.** It is a public, widely cited benchmark of 2,000
labelled customer-service exchanges with a refund section. It takes our refund
coverage from 12 cases to several hundred overnight, we stop hand-writing
cases off the ticket queue, and we get to put a recognised benchmark name on
the trust page instead of "our internal suite".

**3. Add the 27 August exchange as a permanent case.** Ticket, expected reply,
into the refund group, and it stays there forever.

I would do 1 and 3 this week and 2 next sprint.
