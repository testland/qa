# New tester, whole afternoon, a product she has never seen

## Problem Description

Dani joins the streaming squad on Monday. She is an experienced tester but
has never used our smart-TV app and knows nothing about the remote-control
navigation model or the download-for-offline feature.

Her first afternoon is completely free - roughly four hours, 13:00 to 17:00,
nothing else booked. Her mentor is available on chat but is in workshops all
afternoon and cannot pair.

I want two things out of that afternoon: Dani ends it knowing the product
well enough to be useful in Tuesday's planning, and we get something written
down that the squad can actually use. The last two hires each spent their
first afternoon "having a look around" and produced nothing anyone could
read afterwards.

We run against the staging back end. The production licence service is off
limits - a bad request from a test client has taken down playback for real
subscribers before - and she must not sign in with any real subscriber
account. The staging licence stub and the four seeded test accounts are what
she has.

## Output Specification

Produce a single file: `docs/onboarding/dani-first-afternoon.md`.

It must contain:

1. How the four hours are divided into working stretches, with the length
   of each stretch and what separates them.
2. For each stretch, one stated objective - the area, what she uses, and
   what she should be able to answer at the end of it that she could not
   answer at the start.
3. An explicit ordering rationale: why the first stretch is what it is, and
   how what she learns in it feeds the objective of the ones after it,
   including which objectives are only decided once the earlier stretch is
   done.
4. What she writes down inside a stretch, arranged so a reader can separate
   how-the-product-works notes, suspected defects, and questions for the
   squad.
5. What she hands the squad at 17:00 and what happens to it on Tuesday.
6. The areas she should not go near this afternoon.

Available: four hours, one tester, no pairing. Out of scope: the production
licence service, real subscriber accounts, and any code change.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/tv-app-overview.md ===============
# Smart-TV app - orientation notes for new joiners

**Platforms:** Roku, Fire TV, Samsung Tizen, LG webOS. One codebase, four
packaging targets. Staging builds are side-loaded from the QA share.

## Main areas

- **Sign-in:** on-screen code pairing (user types a code on a phone), plus
  an on-TV keyboard fallback.
- **Browse:** rows of tiles driven by a personalisation service. Remote
  navigation only: up/down/left/right, OK, back, play/pause.
- **Playback:** adaptive bitrate, resume-from-position, subtitles, audio
  track switching, and a 10-second skip.
- **Downloads:** only Fire TV and Tizen support offline download; content
  expires 48 hours after first play.
- **Profiles:** up to five per account, one of which can be a kids profile
  with a content-rating cap.

## What the squad already knows is shaky

- Resume position is written every 30 seconds and on pause; a hard power
  cut loses up to 30 seconds. Accepted.
- The personalisation service is slow to warm; the first browse after
  install shows a fallback row set for up to 60 seconds.
- Kids-profile rating caps are enforced in the browse rows but the deep
  link from a notification bypasses the row filter. Reported, not fixed.
- Back-button behaviour differs per platform because each vendor's remote
  maps it differently.

## Test resources

- Four seeded staging accounts: one empty, one with viewing history, one
  with five profiles including a kids profile, one with downloads present.
- Staging licence stub returns a fixed licence and never expires.
- Devices in the lab: Fire TV stick, Roku Express, one Tizen TV. No LG.
- Production licence service must never receive traffic from a test client.
