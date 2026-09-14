# The accessibility PR bot

Built 2026-05-06. The nightly job scans staging and writes JSON into
`a11y/results/`; the bot reads last night's file and posts a comment on every
open pull request.

Design decision at the time: rather than turn on everything and drown people in
output nobody acts on, the run was limited to the rules our design review
already checks by hand. Eight of them. That keeps the comment short enough that
people read it. We can widen later once the team is used to it.

The comment has been clean since launch, which is what we were aiming for.
