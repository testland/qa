# Two changes to the smoke job

**1. Stop walking the toolbar in it.** The job owns the strings, not the view.
Assert that `t()` comes back transformed for every key in `locales/en.json` and
drop the render walk entirely. It is faster, it cannot be broken by someone
moving a control, and it is testing the thing the locale is actually
responsible for.

**2. Add a guard at the top of the job** that fails if any key in
`locales/en.json` is missing or empty, so we stop finding that out from a
render. Four lines and it pays for itself the first time somebody lands a key
with an empty value. - T
