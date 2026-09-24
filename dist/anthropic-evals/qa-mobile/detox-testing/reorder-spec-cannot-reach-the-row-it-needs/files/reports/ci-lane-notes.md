# e2e lane, two Mac minis

Nothing else is scheduled on these machines. The lane is:

    checkout -> npm ci -> pod install -> detox build -> detox test

`detox build` has a median of 11m18s. The simulator is booted by the build step
and then nothing touches it at all until `detox test` starts.

Developer laptops run the same lane with the same configuration, except that
the simulator is usually already up and someone has been clicking around in it
for most of the day before anyone runs the specs.

The minis run the stock runner image. Nobody has changed anything on them since
they were set up in March.
