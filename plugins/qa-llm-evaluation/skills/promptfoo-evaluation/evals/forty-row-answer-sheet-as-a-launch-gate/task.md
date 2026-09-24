# Support handed me an answer sheet and wants all forty rows blocking the release

## Problem Description

We launch the self-serve billing assistant on 2026-09-29. Nadia, who runs
support, has spent three weeks writing an answer sheet: forty questions
customers actually ask, with the answer support would give and where she got it
from. It is attached as `handover/answer-sheet.csv`.

Her request, verbatim from the handover call: "all forty wired up and blocking
the release branch by Friday." Our PM added, in the thread afterwards, "put a
judge on anything that isn't a straight lookup — it can figure the rest out."

I have a small eval already running on the release branch with three cases in
it, and a workflow that blocks the merge on it. I want the sheet folded into
that, and I want it done in a way that is still standing in six months.

What I am uneasy about, and cannot put into words well: Nadia said on the call
that she was sure about some of these and not sure about others, and that the
answer column on its own would not tell me which. I have also attached the
current help-centre extracts the assistant actually retrieves from, because
some of the sheet predates them. I do not want to find out on launch night that
the release branch is blocked by a row we cannot stand behind, and I equally do
not want to be the person who quietly dropped half the sheet because it was
inconvenient. Nadia will read whatever I send back and she will notice if rows
have gone missing without explanation.

This gate runs on every push to the release branch for the next two weeks and I
do not want an unbounded bill arriving on the 30th.

Attached: the answer sheet, the current help-centre extracts, the existing
config, the prompt template, the release-gate workflow and the handover notes.

## Output Specification

1. Edit `evals/billing-assistant/promptfooconfig.yaml`. This is the suite that
   blocks the release branch. Keep the three cases already in it.
2. Anything from the sheet that you conclude must not block the release goes in
   `evals/billing-assistant/promptfooconfig.review.yaml` instead, which must not
   be wired into the blocking job.
3. Edit `.github/workflows/release-gate.yml` if your answer requires it.
4. Write `handover/answer-sheet-triage.md`. It must have a line for every one of
   the forty ids, saying which file that row landed in and what kind of check it
   got. This is what goes back to Nadia.

## Input Files

Extract the following files before beginning.

=============== FILE: handover/answer-sheet.csv ===============
id,question,expected_answer,source
Q01,"How long do I have to request a refund?","30 days from purchase","HC-118"
Q02,"What is the policy code for a late-delivery credit?","BILL-4","credit note template"
Q03,"Why did my invoice go up this month?","Explain that a plan change mid-cycle is prorated and both parts appear on one invoice","HC-142"
Q04,"How many days does a declined card retry for?","7","HC-204"
Q05,"Explain what happens to my data if I cancel.","Explain the 30-day retention window and that export is available until it ends","HC-190"
Q06,"What is the VAT rate applied to UK invoices?","20%","finance, 2026-01"
Q07,"Can a team member remove another team member's seat?","No, only the account owner","R. Patel"
Q08,"Which settings page holds the billing contact?","Settings > Billing > Contact","product UI"
Q09,"Explain why a refund has not arrived yet.","Explain the 5 business day bank window and that we cannot speed it up","HC-118"
Q10,"What is the minimum seat count on Business?","5","pricing page"
Q11,"How many days notice for an annual plan cancellation?","30","HC-131"
Q12,"Explain the difference between a credit and a refund.","Explain that a credit offsets future invoices and a refund returns money to the card","HC-118"
Q13,"Is there a fee for changing plan mid-cycle?","No fee","FAQ, archived 2023"
Q14,"What currency are invoices issued in for EU customers?","EUR","finance, 2026-01"
Q15,"Explain how proration is calculated.","Explain that it is charged to the day on the difference between the two plan prices","HC-142"
Q16,"What is the invoice number format?","INV-YYYY-NNNNNN","invoice template"
Q17,"Explain why a payment might be declined.","Explain the common causes and point to updating the card in Settings","HC-204"
Q18,"How long are invoices retained for download?","7 years","legal, 2025-11"
Q19,"Can we issue a refund after the 30 day window as a goodwill gesture?","Yes at our discretion","draft with legal"
Q20,"Explain what the account owner can do that an admin cannot.","Explain that the owner controls billing details, plan changes and closing the account","HC-155"
Q21,"What is the grace period after a failed renewal?","14 days","HC-209"
Q22,"Explain how to move billing to a different company entity.","Explain that it needs a support ticket and cannot be self-served","HC-166"
Q23,"What is the support email for billing disputes?","billing@parcelwise.example","support footer"
Q24,"How many free users do we include?","Depends","HC-170"
Q25,"Explain what happens at the end of a trial.","Explain that it converts to the chosen plan unless cancelled first","HC-112"
Q26,"What is the maximum number of seats on Team?","25","pricing page"
Q27,"Explain how to download a VAT receipt.","Explain it is attached to each invoice under Settings > Billing","HC-127"
Q28,"Can I pay by direct debit?","Yes, SEPA and BACS","Q4 roadmap"
Q29,"How many days before renewal is the reminder email sent?","14","HC-221"
Q30,"Explain why the seat count on the invoice differs from the seat count today.","Explain that invoices bill the seat count at the start of the period","HC-134"
Q31,"What is the policy code for a duplicate charge reversal?","BILL-9","credit note template"
Q32,"Explain how to change the card on file.","Explain the path through Settings > Billing > Payment method","HC-108"
Q33,"Do we refund shipping on a returned order?","No","agent transcript, 2026-08"
Q34,"How long does a refund take to reach the card?","5 business days","HC-118"
Q35,"Explain what a proforma invoice is and when we issue one.","Explain it is a pre-payment document issued on request for annual plans","HC-181"
Q36,"What is the cutoff time for same-day invoice reissue?","16:00 UTC","operations, 2026-02"
Q37,"Explain why an annual plan cannot be downgraded mid-term.","Explain that the term is committed and the change applies at renewal","HC-142"
Q38,"Which plan tier includes SSO?","Business","pricing page"
Q39,"Should we tell customers the refund has been approved before finance signs it off?","No","my note"
Q40,"Explain what happens to unused seats at renewal.","Explain that the renewal bills the current seat count and unused seats are not credited","HC-134"

=============== FILE: handover/help-centre-extracts.md ===============
# Help-centre extracts the assistant retrieves from, as published 2026-09-08

**HC-108 — Payment methods.** We accept Visa, Mastercard and American Express.
The card on file is changed under Settings > Billing > Payment method.

**HC-112 — Trials.** A trial converts to the chosen plan at the end of the
trial period unless it is cancelled first.

**HC-118 — Refunds.** Customers may request a full refund within 30 days of
purchase. Refunds cover the item price and are issued to the original payment
method within 5 business days; we cannot speed the bank up. A credit offsets
future invoices; a refund returns money to the card.

**HC-121 — Returns and postage.** Return postage is reimbursed when the item
arrived faulty or was sent in error. In all other cases return postage is paid
by the customer.

**HC-134 — Billing periods and seats.** An invoice bills the seat count as it
stood at the start of the period. At renewal we bill the current seat count;
unused seats are not credited.

**HC-142 — Plan changes.** A plan change mid-cycle is prorated to the day on
the difference between the two plan prices, and both parts appear on one
invoice. Since 2026-04-01 a £5 administration fee applies to a downgrade taken
mid-cycle. Annual terms are committed and a downgrade applies at renewal.

**HC-155 — Roles and seats.** The account owner controls billing details, plan
changes and closing the account. Account owners and admins can both add and
remove seats.

**HC-170 — Users included in each plan.** Starter includes 1 free viewer, Team
includes 3 free viewers, Business includes 10 free viewers.

**HC-204 — Declined payments.** A declined payment retries for 7 days before
the account is suspended. The usual causes are an expired card, insufficient
funds, or a bank block; the card is updated in Settings.

Every other article named in the sheet's source column was re-read on 2026-09-08
and agrees with the sheet, as did the pricing page, the invoice and credit-note
templates and the support footer.

Nothing is published on goodwill refunds outside the 30-day window. That wording
has been with legal since 2026-08-20.

=============== FILE: evals/billing-assistant/prompt.txt ===============
You are the Parcelwise billing assistant. Answer the customer using only the
help-centre extract supplied. If the extract does not answer the question, say
you will pass it to a person.

Help-centre extract:
{{context}}

Customer question: {{question}}

=============== FILE: evals/billing-assistant/promptfooconfig.yaml ===============
description: Billing assistant release gate

prompts:
  - file://prompt.txt

providers:
  - openai:gpt-5-mini-0613

defaultTest:
  assert:
    - type: cost
      threshold: 50

tests:
  - description: refund_window
    vars:
      question: How long do I have to request a refund?
      context: Customers may request a full refund within 30 days of purchase.
    assert:
      - type: contains
        value: '30 days'

  - description: cancel_notice
    vars:
      question: How much notice do I need to give on an annual plan?
      context: Annual plans require 30 days notice of cancellation.
    assert:
      - type: contains
        value: '30'

  - description: explains_a_price_rise
    vars:
      question: Why did my invoice go up this month?
      context: A plan change mid-cycle is prorated to the day and both parts appear on one invoice.
    assert:
      - type: llm-rubric
        value: explains that the change was prorated and that both parts appear on a single invoice

=============== FILE: .github/workflows/release-gate.yml ===============
name: release-gate

on:
  push:
    branches:
      - 'release/**'

jobs:
  billing-assistant:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Billing assistant gate
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npx promptfoo eval -c evals/billing-assistant/promptfooconfig.yaml

=============== FILE: handover/README.md ===============
# Handover notes, 2026-09-08

Nadia's sheet was built from a sample of 1,200 billing tickets from Q2. She
filled the `expected_answer` column herself and recorded where each answer came
from in the `source` column.

Her words on the call: "some of these I am sure about and some of these I am
not, and I could not tell you which from the answer column alone."

Unrelated, for context on the eval itself: we put a $50 guard on the job in June
after a bill nobody expected. It has been on every run since and has never
tripped once, which I have been treating as good news.
