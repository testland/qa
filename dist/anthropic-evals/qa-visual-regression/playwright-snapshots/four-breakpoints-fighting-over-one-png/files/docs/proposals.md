# Thread: "why does only desktop-1280 ever fail" - #storefront-quality

**@marco** (2026-09-09 10:02)
Four projects, and the path setting does not pull them apart properly, so they
land on top of each other. One winner per run, and that is the whole bug. Branch
is fix/snapshot-path-width, it rewrites the path setting to
`{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}-w{width}{ext}`.

**@nadia** (2026-09-09 10:31)
While we are in there: kill wide-1920. Eighteen months, zero failures ever
reported by it, nine minutes of runner time per PR, every PR. If a project has
never once told us anything we should not be paying for it.

**@kev** (2026-09-09 10:48)
Whatever lands, we should re-record the whole set afterwards so we are not
carrying whatever those old files contain. One update pass over the suite,
commit, done. Takes four minutes.

**@marco** (2026-09-09 11:05)
Agreed on the re-record. I ran it on my branch already and everything came back
green on the second run, which is a good sign.
