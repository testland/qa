# Replacing the 85% threshold, Nadia, 2026-08-18

The old gate asserted an absolute pass rate. Three things were wrong with it.
It could not see a regression that stayed above the line. It had no record of
what the suite used to do, so we could never prove a regression happened. And
every time it went red the conversation was about the threshold rather than
about the change.

The new gate compares the run against the previous run. A drop fails the build
regardless of the absolute level, which is the property we actually wanted.
There is no number for anyone to argue down.

Mechanics: the job pulls `latest.json` from the eval bucket before the run,
compares, and writes the run back as the new `latest.json` afterwards. The
bucket has a five-day lifecycle rule, which finance asked for and which is
fine because the job runs on every push.

`ci/gate.test.mjs` covers the comparison in both directions plus the boundary.
It is five tests and they pass.

Two things I have deliberately not done. I have not kept the absolute
threshold, because keeping both means the weaker one is what people look at.
And I have not made the gate tolerate small drops, because a tolerance is just
a threshold with extra steps and we would be arguing about its value within a
month.
