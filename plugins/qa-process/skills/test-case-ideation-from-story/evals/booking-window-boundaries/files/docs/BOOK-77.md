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
