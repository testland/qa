# INC-4471: 214 customers got the wrong refund figure and the suite never went red

## Problem Description

I am writing up INC-4471 and I am stuck on the action items.

For eleven days the billing assistant told customers their refund was a
different number from the one we actually sent them — $41.00 where the answer
was $14.00 in the case that finally got noticed — and 214 people were given a
wrong figure before support ops found it in a ticket thread on 27 August. The
evaluation suite ran on every pull request through that period and nightly
after it, and was green every single time. The refund group specifically
reported 100% the whole way through.

Dan has written up three things he wants to do about it. He is the person who
built the scoring back in June and he has been straight about the fact that it
did not work, so I want each of his three judged on its own rather than a
general comment on the shape of the plan. Where one of them is wrong I need the
reason to be something I can put in front of him, which means pointing at the
files rather than at principles.

The incident review also asked me two questions I have not been able to answer
and I would like your direct answer on each:

- Did the model get worse in August, or has it always been capable of this and
  we only noticed now?
- Did anything change on our side in the run-up to 27 August?

Attached: the refund case definitions, the calibration samples Dan collected in
June when he set the scoring up, his post-incident proposal, the CI workflow,
the incident record, and the release log. That is everything; there is no other
store of run data.

## Output Specification

1. Write `docs/inc-4471-eval-gap.md` — why this suite stayed green while the
   assistant was emitting a wrong number, each point tied to the file and line
   it rests on, each with a severity of Critical, Warning or Info, ranked by how
   much each one mattered to this incident.
2. Write `docs/proposal-verdicts.md` — a separate verdict on each of Dan's
   three proposals with the reason for each.
3. Edit `evals/refund-cases.yaml` so that the same change would be caught,
   leaving anything that is already doing its job as it is.
4. Write `docs/two-questions.md` — a direct answer to each of the two questions
   above.

## Input Files

Extract the following files before beginning.

=============== FILE: evals/refund-cases.yaml ===============
# 12 refund cases. Same two-assertion shape on each; three shown in full.
- id: refund-reply-01
  vars:
    ticket: "Duplicate seat charge on the September invoice."
    correct_refund: "14.00"
  assert:
    - type: similar
      value: "A refund of $14.00 has been issued to the card ending 4417. It should appear within 5 business days."
      threshold: 0.80
    - type: llm-rubric
      value: "Reply is polite, explains the refund and gives the customer a next step."

- id: refund-reply-02
  vars:
    ticket: "Cancelled on day 9 of a 30 day cycle at $60.00."
    correct_refund: "42.00"
  assert:
    - type: similar
      value: "A refund of $42.00 has been issued to the card ending 0192. It should appear within 5 business days."
      threshold: 0.80
    - type: llm-rubric
      value: "Reply is polite, explains the refund and gives the customer a next step."

- id: refund-reply-03
  vars:
    ticket: "Charged twice for the August invoice at $41.00."
    correct_refund: "41.00"
  assert:
    - type: similar
      value: "A refund of $41.00 has been issued to the card ending 7731. It should appear within 5 business days."
      threshold: 0.80
    - type: llm-rubric
      value: "Reply is polite, explains the refund and gives the customer a next step."

# refund-reply-04 .. refund-reply-12 follow the same shape against their own
# reference replies. `correct_refund` is set on every case and is not read by
# any assertion; it is there for the ticket generator.

=============== FILE: data/similarity-calibration-2026-06.csv ===============
# 18 sampled replies to refund-reply-01, scored against the reference answer
# and labelled independently by two people on support ops. Collected 2026-06-11
# when the threshold was chosen. Correct figure for this ticket is $14.00.
sample,similarity,human_verdict,reply
s01,0.77,ok,"Your refund of $14.00 is on its way to the card ending 4417 and should land within five working days."
s02,0.94,wrong,"Good news - a refund of $41.00 has been issued to the card ending 4417. It should appear within 5 business days."
s03,0.68,ok,"We've refunded $14.00. Expect it on the 4417 card inside a week."
s04,0.89,wrong,"A refund of $4.00 has been issued to the card ending 4417. It should appear within 5 business days."
s05,0.91,ok,"A refund of $14.00 has been issued to the card ending 4417. It should arrive within 5 business days."
s06,0.72,ok,"You'll see $14.00 back on the card ending 4417, usually within five working days."
s07,0.86,wrong,"A refund of $140.00 has been issued to the card ending 4417, arriving within 5 business days."
s08,0.84,ok,"We have issued a refund of $14.00 to the card ending 4417; allow five business days."
s09,0.61,wrong,"Sorry about that. Money is being sent back to you and it will show up soon."
s10,0.79,ok,"$14.00 has been refunded to the card ending 4417. Give it about five business days."
s11,0.92,wrong,"A refund of $41.00 has been issued to the card ending 4417. It should arrive within 5 business days."
s12,0.70,ok,"The $14.00 is on its way back to the 4417 card - five working days or so."
s13,0.83,wrong,"A refund of $44.00 has been issued to the card ending 4417. It should appear within 5 business days."
s14,0.88,ok,"A refund of $14.00 has been sent to the card ending 4417 and should appear within 5 business days."
s15,0.74,ok,"We've put $14.00 back on the card ending 4417. It usually takes five business days."
s16,0.76,wrong,"We have refunded $41.00 to your card. It normally takes about a week to show."
s17,0.69,ok,"A $14.00 refund is heading back to the 4417 card, roughly five business days."
s18,0.81,ok,"A refund of $14.00 has been issued to the card ending 4417. Allow 5 business days."

=============== FILE: proposals/post-incident.md ===============
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

=============== FILE: .github/workflows/eval.yml ===============
name: eval

on:
  pull_request:
  schedule:
    - cron: '0 3 * * *'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npx promptfoo eval -c evals/promptfooconfig.yaml -o out.json
      - run: node ci/summarise.mjs out.json
      - run: test "$(node ci/rate.mjs out.json)" = "1.00"

=============== FILE: incident/INC-4471.md ===============
# INC-4471

**Detected** 2026-08-27 16:40 by support ops, reading a ticket thread.
**Window** 2026-08-16 to 2026-08-27. **Affected** 214 customers.

The assistant stated a refund figure that did not match the refund actually
issued. In the exchange that surfaced it, the customer was refunded $14.00 and
the reply read:

    Good news - a refund of $41.00 has been issued to the card ending 4417.
    It should appear within 5 business days.

Support ops reviewed 40 of the 214 exchanges by hand. In all 40 the prose was
correct, polite and carried a next step; the figure was wrong in 31 of them.

The eval suite ran 11 nightly jobs and 14 pull-request jobs in the window.
Every one reported 100% on the refund group. No run output from any of them
exists now.

Telemetry pulled afterwards, for the window: p95 reply latency 2.6s, mean cost
per assisted reply $0.0071. Product SLO for the assistant is 1.2s p95; the
figure finance signed off is $0.005 per assisted reply.

=============== FILE: docs/release-log.md ===============
# Billing assistant releases

| date       | release | prompt template sha | model identifier in config |
|------------|---------|---------------------|----------------------------|
| 2026-07-16 | 4.7     | 0f21ac9             | openai:gpt-4o              |
| 2026-07-30 | 4.8     | 0f21ac9             | openai:gpt-4o              |
| 2026-08-14 | 4.9     | b74e330             | openai:gpt-4o              |
| 2026-09-01 | 4.10    | b74e330             | openai:gpt-4o              |

The sha is of `prompts/billing-assistant.txt`. The model identifier column is
copied from the config at release time.
