# Trial customer says his call notes vanished, wants it fixed today

## Problem Description

A customer on a free trial of our CRM emailed the founders' address at 23:40
saying his notes disappeared, and copied his account manager. The email is
angry, it contains its own instructions about how urgently we should treat it,
and it contradicts itself about whether anything was actually lost.

Our account manager pulled the account record and attached it. She also
mentions, second-hand, that a large enterprise customer "may have hit the same
thing", which nobody has confirmed.

Two different decisions come out of this, and they are made by different people:
how bad the failure is for a user who hits it, and where it lands in the fix
queue given who is affected and what else is in flight. The engineering lead
wants those separated in whatever we write, because the last three escalations
arrived with a single "critical, drop everything" label attached by the person
who was shouting loudest.

## Output Specification

1. Write `reports/crm-note-loss.md`.
2. The document goes to both the engineering lead and the product manager, who
   are making different calls from it.
3. It must be defensible to someone who did not read the customer's email and
   will not take the customer's own framing at face value.

Out of scope: replying to the customer, opening the code, or making the
scheduling call yourself.

## Input Files

Extract the following files before beginning.

=============== FILE: inbox/customer-email.md ===============
From:    Devrim A. <devrim@quarrylane.example>
To:      founders@kettleby-crm.example
Cc:      account manager
Sent:    2026-08-12 23:40
Subject: THREE WEEKS OF CALL NOTES GONE - fix this tonight

I have been evaluating your product and tonight it deleted my work. I was in a
deal record typing up a call, stepped away, came back and the whole thing was
blank. Three weeks of call notes are gone. This is critical, it's a P0, drop
whatever you're doing.

To be fair nothing was actually lost in the end, I retyped what I could
remember from tonight and it saved that time. But I can't trust it now. If it
does this again during a real deal I'm finished with it.

I don't know what browser it is, whatever came with the laptop. It was late,
maybe 11ish. It has probably been doing this for a while and I didn't notice.

Devrim

=============== FILE: inbox/account-record.md ===============
Account:        Quarrylane (prospect)
Plan:           Free trial, day 9 of 14
Seats in use:   1
Contract value: none
Support tier:   trial (best effort, business hours)
Signed up:      2026-08-04
Region:         EU

Account manager note:
  Devrim is the only user on this trial. Nobody else on the account has
  reported anything. Renewal/conversion call is booked for the 19th.

  Separately - I have a vague memory of someone on the enterprise side
  mentioning notes disappearing a few months back. I can't find the ticket and
  I'm not sure it was the same thing. Don't quote me on it.
