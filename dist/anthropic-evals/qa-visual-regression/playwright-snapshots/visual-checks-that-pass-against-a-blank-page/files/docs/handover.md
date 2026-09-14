# Handover - web QA suite (contractor, 2026-03-27)

Visual checks live in `tests/visual.spec.ts`.

Things I did and did not get to:

- The chat bubble (`#intercom-container`) and the "last synced N minutes ago"
  line (`.session-timer`) are on every page and both move. I put them both into
  the screenshot defaults in `playwright.config.ts` so every check picks them up
  without anyone having to remember. The committed images still have the bubble
  in them because they were all captured before I did that - somebody should
  re-run the update job at some point and they will come out clean.
- Stopped the marketing one being flaky. It was failing on days when the hero
  element was not on the page. It does not do that any more.
- The pricing page has a currency switcher. Every other spec in the repo pins
  the currency through the URL; the visual one does not, and I never went back
  to it.
