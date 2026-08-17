# Lab door policy: the reader firmware needs a test list and the policy is prose

## Problem Description

Site security is replacing the badge reader on the lab door. The policy extract
below is what the current reader implements, as far as anyone knows - the
original configuration was done by a contractor who has left, and the policy is
the only surviving description.

The policy is written the way policies are written: each sentence describes a
kind of person in a kind of situation. Those sentences overlap in places and
leave a hole in at least one place, and because each sentence bundles several
facts together, it is genuinely hard to see from the text which situations it
covers and which it does not. The auditor has already asked us whether an
escorted person is always logged, and I could not answer.

I want a document the security lead and I can walk through the door with, that
covers every situation the reader can actually be presented with, so we can badge
each one and compare the reader against the policy rather than against our
memory of it.

## Output Specification

Produce `door-access-analysis.md` containing:

1. The facts the reader has to know about a person and a moment in order to
   decide, listed one per line. Keep them at the level the reader works at - a
   badge attribute, a clock reading, whether someone else is at the door.
2. Every distinct result the door can produce, listed separately.
3. A table giving the expected result for every situation those facts can
   produce together.
4. Any situation the policy does not settle, raised as a question for the
   security lead rather than answered with what seems reasonable.
5. The badge-in attempts we should physically perform at the door, and what each
   one is checking.

Out of scope: the badge issuance process, the fire-alarm override, and anything
about the reader's network configuration.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/lab-access-policy.md ===============
# Lab door access (site policy extract, section 4)

A permanent employee who holds lab clearance may badge into the lab at any hour.

A contractor who holds lab clearance may badge in during core hours, which are
07:00 to 19:00.

A contractor who does not hold lab clearance may enter only when accompanied by
an escort, and only during core hours.

A permanent employee who does not hold lab clearance may enter when accompanied
by an escort, at any hour.

Every escorted entry is written to the review log. Entries that are not escorted
are not logged separately.

Anyone refused at the door is shown "contact your site manager" on the reader
display.

Escorts are themselves badge holders and badge in on their own credentials; the
reader treats an escorted entry as two entries, and only the escorted person's
entry is subject to this section.
