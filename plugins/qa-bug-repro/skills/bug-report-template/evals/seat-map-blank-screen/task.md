# Travel agent can't get the seat map to appear for a client's booking

## Problem Description

A partner travel agency emailed our airline's trade desk to say the seat
selection page comes up blank for one of their clients' bookings. The trade desk
forwarded it to us with a screenshot the agent attached; our accessibility tooling
transcribed the screenshot because nobody on the web team could open the
proprietary format the agency's mail client wrapped it in.

The email and the transcription do not agree about which flight leg was on
screen, and the agent describes her browser the way most people do — by saying it
is up to date. There is no error text anywhere: the page renders its frame and
the seat grid area is simply empty.

The web team's process is that a report without a reproducible starting point
gets returned to the reporter rather than assigned. We would rather ask the
agency once, in a single email, than trade three rounds with them.

## Output Specification

1. Write `reports/seat-map-blank.md`.
2. A web engineer with no access to this email should be able to attempt a
   reproduction from the document alone, or see immediately why they cannot.
3. If the report is going back to the agency for more, the document must contain
   exactly what to ask for.

Out of scope: opening the booking system, looking at any front-end code, or
contacting the agency yourself.

## Input Files

Extract the following files before beginning.

=============== FILE: inbox/trade-desk-email.md ===============
From:    Marisol Vega <m.vega@havenport-travel.example>
To:      tradedesk@aeloria.example
Sent:    2026-08-13 11:26
Subject: seat map won't load for a client

Hello,

I'm trying to seat a client and the seat page is just empty. I get the page with
the flight along the top and the little legend on the right but where the seats
should be there's nothing at all. No error, no spinner, just white.

It's on the return leg. The outbound was fine, I seated her yesterday.

I'm on the latest Chrome, fully updated, on the work machine. My colleague tried
and I think it worked for her but she's on a Mac. The client is a Silver member
if that matters, I don't know what tier the fare is, the agency system books it.

I can't send the booking reference over email per our policy, our desk can give
it to you on the phone.

Thanks
Marisol

=============== FILE: inbox/screenshot-transcription.md ===============
Transcription of attachment "seatmap.png" (agency mail client wrapped the
original; this text description is what our tooling produced)

  Browser window, no address bar visible in the crop.

  Page header reads: "Select your seats"
  Below it a flight strip: "AE 1148  DUB -> LHR  Fri 22 Aug  09:15"
  A tab strip is visible with two tabs; the left tab appears selected and reads
  "Outbound", the right tab reads "Return".
  Main content area: blank white region roughly 900 x 600.
  Right-hand column shows a legend: Standard / Extra legroom / Exit row.
  Footer shows "Continue" in a disabled state.
  No error text, no dialog, no console visible.
