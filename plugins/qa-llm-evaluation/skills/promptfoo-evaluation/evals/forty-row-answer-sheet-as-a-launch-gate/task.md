# Support handed me an answer sheet and wants all forty rows blocking the release

## Problem Description

We launch the self-serve billing assistant on 2026-09-29. Nadia, who runs
support, has spent three weeks writing an answer sheet: forty questions
customers actually ask, with the answer support would give. It is attached as
`handover/answer-sheet.csv`, including her notes column, which she asked me to
read rather than skip.

Her request, verbatim from the handover call: "all forty wired up and blocking
the release branch by Friday." Our PM added, in the thread afterwards, "put a
judge on anything that isn't a straight lookup — it can figure the rest out."

I have a small eval already running on the release branch with three cases in
it, and a workflow that blocks the merge on it. I want the sheet folded into
that, and I want it done in a way that is still standing in six months.

What I am uneasy about, and cannot put into words well: some of those forty
rows I would be happy to be woken up for at 3am, and some of them I would not.
The notes column is why. I do not want to find out on launch night that the
release is blocked by a row where two people on Nadia's own team wrote down
different answers, and I equally do not want to be the person who quietly
dropped half the sheet because it was inconvenient. Nadia will read whatever I
send back and she will notice if rows have gone missing without explanation.

Budget is not the issue here, but this gate runs on every push to the release
branch for the next two weeks and I do not want an unbounded bill arriving on
the 30th.

Attached: the answer sheet, the existing config, the prompt template and the
release-gate workflow.

## Output Specification

1. Edit `evals/billing-assistant/promptfooconfig.yaml`. This is the suite that
   blocks the release branch. Keep the three cases already in it.
2. Anything from the sheet that you conclude must not block the release goes in
   `evals/billing-assistant/promptfooconfig.review.yaml` instead, which must not
   be wired into the blocking job.
3. Edit `.github/workflows/release-gate.yml` if your answer requires it.
4. Write `handover/answer-sheet-triage.md`. It must have a line for every one of
   the forty ids, saying which file that row landed in and what kind of check it
   got. For any row that is not blocking the release, it must say what
   specifically has to be settled before it could be — this document is what
   goes back to Nadia.

## Input Files

Extract the following files before beginning.

=============== FILE: handover/answer-sheet.csv ===============
id,question,expected_answer,notes
Q01,"How long do I have to request a refund?","30 days from purchase","HC-118, unchanged since 2022"
Q02,"What is the policy code for a late-delivery credit?","BILL-4","exact code, appears on the credit note"
Q03,"Why did my invoice go up this month?","Explain that a plan change mid-cycle is prorated and both parts appear on one invoice","wording flexible, must mention proration"
Q04,"How many days does a declined card retry for?","7","HC-204"
Q05,"Explain what happens to my data if I cancel.","Explain the 30-day retention window and that export is available until it ends","wording flexible, must mention the 30-day window and export"
Q06,"What is the VAT rate applied to UK invoices?","20%","finance confirmed 2026-01"
Q07,"Can a team member remove another team member's seat?","No, only the account owner","R. Patel says no, M. Oduya says yes for admins - unresolved as of 2026-09-10"
Q08,"Which settings page holds the billing contact?","Settings > Billing > Contact","exact navigation path"
Q09,"Explain why a refund has not arrived yet.","Explain the 5 business day bank window and that we cannot speed it up","wording flexible, must not promise a date"
Q10,"What is the minimum seat count on Business?","5","pricing page"
Q11,"How many days notice for an annual plan cancellation?","30","HC-131"
Q12,"Explain the difference between a credit and a refund.","Explain that a credit offsets future invoices and a refund returns money to the card","wording flexible"
Q13,"Is there a fee for changing plan mid-cycle?","No fee","copied from the 2023 FAQ, we think this is now wrong but nobody has confirmed"
Q14,"What currency are invoices issued in for EU customers?","EUR","finance confirmed 2026-01"
Q15,"Explain how proration is calculated.","Explain that it is charged to the day on the difference between the two plan prices","wording flexible, must mention to the day"
Q16,"What is the invoice number format?","INV-YYYY-NNNNNN","exact format, appears on every invoice"
Q17,"Explain why a payment might be declined.","Explain the common causes and point to updating the card in Settings","wording flexible"
Q18,"How long are invoices retained for download?","7 years","legal confirmed 2025-11"
Q19,"Can we issue a refund after the 30 day window as a goodwill gesture?","Yes at our discretion","legal to confirm the wording before launch - do not treat as final"
Q20,"Explain what the account owner can do that an admin cannot.","Explain that the owner controls billing, seats and closure","wording flexible"
Q21,"What is the grace period after a failed renewal?","14 days","HC-209"
Q22,"Explain how to move billing to a different company entity.","Explain that it needs a support ticket and cannot be self-served","wording flexible, must say it is not self-serve"
Q23,"What is the support email for billing disputes?","billing@parcelwise.example","exact address"
Q24,"How many free users do we include?","Depends","depends on which plan the customer is on and the question does not say which"
Q25,"Explain what happens at the end of a trial.","Explain that it converts to the chosen plan unless cancelled first","wording flexible"
Q26,"What is the maximum number of seats on Team?","25","pricing page"
Q27,"Explain how to download a VAT receipt.","Explain it is attached to each invoice under Settings > Billing","wording flexible"
Q28,"Can I pay by direct debit?","Yes, SEPA and BACS","we do not actually support this yet, the expected answer describes what we intend to build in Q4"
Q29,"How many days before renewal is the reminder email sent?","14","HC-221"
Q30,"Explain why the seat count on the invoice differs from the seat count today.","Explain that invoices bill the seat count at the start of the period","wording flexible"
Q31,"What is the policy code for a duplicate charge reversal?","BILL-9","exact code"
Q32,"Explain how to change the card on file.","Explain the path through Settings > Billing > Payment method","wording flexible"
Q33,"Do we refund shipping on a returned order?","No","two agents gave opposite answers to this last month and the customer accepted both; nobody has ruled"
Q34,"How long does a refund take to reach the card?","5 business days","HC-118"
Q35,"Explain what a proforma invoice is and when we issue one.","Explain it is a pre-payment document issued on request for annual plans","wording flexible"
Q36,"What is the cutoff time for same-day invoice reissue?","16:00 UTC","operations confirmed 2026-02"
Q37,"Explain why an annual plan cannot be downgraded mid-term.","Explain that the term is committed and the change applies at renewal","wording flexible"
Q38,"Which plan tier includes SSO?","Business","pricing page"
Q39,"Should we tell customers the refund has been approved before finance signs it off?","No","this is my own opinion, nobody has reviewed it"
Q40,"Explain what happens to unused seats at renewal.","Explain that the renewal bills the current seat count and unused seats are not credited","wording flexible"

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
filled the `expected_answer` column herself except where the notes say
otherwise, and she asked twice that the notes column be read alongside it.

Her words on the call: "the notes are there because some of these I am sure
about and some of these I am not, and I could not tell you which from the
answer column alone."
