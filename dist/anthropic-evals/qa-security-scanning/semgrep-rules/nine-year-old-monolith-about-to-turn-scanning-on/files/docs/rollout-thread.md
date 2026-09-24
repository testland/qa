# #eng-platform — 2026-09-10

**marta.reinholt** (staff, built the gate) — I have gone through #4530 and I
think the rulesets are the problem. `p/javascript` and `p/owasp-top-ten` are
community packs; they clearly do not carry whatever rule would have caught a
cookie attribute. Switch the config over to registry auto-detection so we pick
up everything the registry has for this repo instead of guessing which pack
holds what. Three weeks of shadow running produced four findings in total,
which tells me the plumbing is right and the rule coverage is not.

**dev.chaudhary** — I read it the other way round. The gate only looks at what
the branch changed against a baseline, and that is exactly how something walks
through: the support module has been edited twenty-odd times since the baseline
was cut. Drop the baseline, scan the whole tree on every PR, take the pain for a
fortnight. We have a board commitment, not a comfort commitment.

**marta.reinholt** — 1,853 findings on every pull request and the check is
switched off by Friday. I have watched that happen at two companies. If we are
not dropping the baseline then at minimum take `src/legacy/` out of the scan —
1,504 of those findings are in a tree nobody is allowed to refactor anyway.

**t.okonkwo** — Whichever of you is right, it has to be written down and in
front of the VP on Monday, and blocking on the first.
