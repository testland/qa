# The Spanish lane was not running Spanish for three days

2026-08-18: device fleet reimaged. The four devices allocated to ios-es-MX came
back with the system language left at English (US); the provisioning script sets
the region but not the language.

2026-08-18 to 2026-08-21: ios-es-MX reported 6 passed / 0 failed on every run.
Nobody looked, because it was green.

2026-08-21: noticed by @mateo while screenshotting for the launch deck. Language
set by hand on all four devices. Lane went to 4 failures on the next run and has
stayed there.

No alert fired at any point. Nothing in the run output states which language the
app was actually running in.
