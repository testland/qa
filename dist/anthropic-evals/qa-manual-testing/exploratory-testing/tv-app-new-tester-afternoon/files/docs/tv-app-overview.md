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
