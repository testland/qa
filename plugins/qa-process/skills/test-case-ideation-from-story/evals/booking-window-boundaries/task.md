# Clinic booking rules keep failing exactly at their own limits

## Problem Description

BOOK-77 is the patient-facing slot booking for our clinic pilot. The rules are
all "no more than" and "no less than" style limits, and every defect we have
had on the previous version of this screen landed on or next to one of those
limits rather than in the middle of the allowed range: a slot exactly two hours
away that the API accepted and the UI hid, and a patient who ended up with four
upcoming appointments because a cancelled one was still being counted.

Reception is running acceptance on this manually. They want a list they can
work through in a session, and they want it to be obvious that the limits
themselves were exercised rather than a comfortable value in the middle of each
range.

The story below is what the backlog carries. Read the acceptance criteria and
the implementation note together; some of what a tester needs is only in the
note, and at least one thing a tester needs is in neither.

## Output Specification

1. Produce `docs/test-cases/BOOK-77.md` containing a single markdown table
   reception can work through row by row.
2. Anything the story leaves genuinely undecided must be visible in the
   document as an open question rather than settled silently on your way to
   writing a row.
3. Out of scope: automated tests, the back-office override screen, and the SMS
   provider integration.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/BOOK-77.md ===============
# BOOK-77 — Patient books an appointment slot

**Type:** Story
**Epic:** Self-service scheduling

## Story

As a registered patient, I want to book an available appointment slot with my
clinic, so that I do not have to phone reception during opening hours.

## Acceptance criteria

- AC-1: The patient sees available slots for the next 90 days.
- AC-2: A slot can be booked no less than 2 hours before it starts.
- AC-3: A patient may hold at most 3 upcoming appointments at any time.
- AC-4: Slots are 15, 30 or 60 minutes. The length is fixed by the clinic per
  appointment type; the patient does not choose it.
- AC-5: A booking can be cancelled free of charge until 24 hours before the
  slot starts. Later than that, a 15.00 EUR late-cancellation fee applies.
- AC-6: An SMS confirmation is sent immediately on a successful booking.

## Implementation note (from the tech lead)

Slot times are stored in UTC and rendered in the clinic's local timezone. All
pilot clinics are Europe/Berlin, which observes daylight saving. The booking
endpoint takes an ISO-8601 instant, so the client is responsible for the
conversion.

Reception can override every rule above from the back office. That screen is
out of scope for this story.
