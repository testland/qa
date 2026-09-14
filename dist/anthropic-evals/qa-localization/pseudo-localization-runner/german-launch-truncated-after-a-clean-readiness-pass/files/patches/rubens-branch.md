# fix/green-readiness - two edits, both in src/pseudo.js

**1. MULTIPLIER back to 1.**

> I set it to 2 in March. Design asked me to put it back after the first
> screenshot review, because the padded output moved every box on the page, so a
> reviewer could not tell a real layout change from padding. With MULTIPLIER at
> 1 the output is the same length as the input, a screenshot diff shows only
> genuine movement, and the check still walks every key. - R

**2. Take the accents out of MAP.**

> Two systems choke on the accented output: the invoice exporter and the CI log
> shipper. Neither is ours to rebuild and neither is in the budget this quarter.
> Mapping each accented character back to its plain equivalent (a-grave to a,
> s-caron to s, and so on) costs us nothing - the square brackets still mark an
> unwrapped string, which was always the point - and both jobs stop failing the
> moment it lands. - R
