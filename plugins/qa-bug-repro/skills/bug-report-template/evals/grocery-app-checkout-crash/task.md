# One-star review says the app closes itself at checkout

## Problem Description

A one-star App Store review landed overnight for our iOS grocery app and the
community manager forwarded it into the mobile channel. A colleague replied in
the thread saying she had seen the same thing and pasted the top of a crash log
she pulled off her own phone.

That is the whole evidence pile: a public review written by someone we cannot
reply to privately, and one partial log from a teammate. The version numbers in
the two do not agree, and neither source records the phone model or the iOS
release the crash happened on.

Mobile triage runs at 11:00 and the on-call engineer has never touched this
flow. They need something they can act on that does not require them to
reconstruct the thread.

## Output Specification

1. Write `reports/checkout-crash-ios.md` — a single document for the 11:00
   mobile triage.
2. It must be usable by an engineer who cannot see the App Store listing or the
   chat thread.
3. Triage will decide whether to chase the teammate for more detail, so the
   document has to make clear what she would need to supply.

Out of scope: symbolicating anything, opening the crash reporter, guessing at
root cause, or replying to the review.

## Input Files

Extract the following files before beginning.

=============== FILE: inbox/app-store-review.md ===============
Source:  App Store review, Fernway Grocery (US storefront)
Pulled:  2026-08-12 07:40 UTC by community team
Rating:  1 star
Title:   "unusable now"

Body:

  Was fine for a year. Now every time I go to pay it just closes. I fill the
  basket, put in the delivery slot, hit the pay button and I'm back at my home
  screen. Lost my whole shop twice. Updated the app this week and it's the same.
  iPhone.

Reviewer handle: bex_h_1988
Note from community team: reviews cannot be replied to privately and this
reviewer has not contacted support. No order ID, no account email.

=============== FILE: inbox/mobile-channel-thread.md ===============
#mobile-app — 2026-08-12

09:02  priya:   forwarding this one star review, sounds like the pay button
09:02  priya:   [link to review]
09:11  dana:    ugh I actually had this yesterday on 4.2.1, app died on the pay
                step, had to redo the basket
09:12  dana:    grabbing the log off my phone one sec
09:14  dana:    here's the top of it

                Incident Identifier: 4B2C-11EE-9A0F
                Hardware Model:      (redacted by dana - "not sharing my serial")
                Process:             FernwayGrocery [8813]
                Version:             4.1.9 (4190)
                Code Type:           ARM-64
                OS Version:          (line was cut off in dana's screenshot)
                Exception Type:      EXC_BAD_ACCESS (SIGSEGV)
                Exception Subtype:   KERN_INVALID_ADDRESS at 0x0000000000000010
                Triggered by Thread: 0

09:15  dana:    only happened the once for me, didn't try again, I needed the
                groceries so I ordered on the website
09:31  priya:   is 4.2.1 the store build? I thought we were still rolling out
09:33  priya:   nvm ask mobile triage
