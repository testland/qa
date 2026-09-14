# Thread: "INC-2214 - why was the visual job green" - #web-quality

**@sasha** (2026-09-05 09:12, Director of Engineering)
I looked this up. The per-image setting is the fraction of the image we allow to
differ. Ours is at 0.55, which means we are tolerating fifty-five percent of the
page changing before anything complains. One column is nowhere near half a page,
so of course it sailed through. Take it to 0.15 and we would have caught this on
the first run.

**@sasha** (2026-09-05 09:15)
Separately, push it to 0.8 on the marketing project. Their hero gradient dithers
differently on every capture and they are tired of being paged about it.

**@nina** (2026-09-05 09:41, Head of Web)
The tier grid moves constantly because of the price experiment. Cover the whole
grid so it stops producing noise, and then the rest of the page is a stable
comparison we can actually trust.

**@ravi** (2026-09-05 10:02)
Or we accept that this check has never caught anything in nine months and delete
it. We are paying runner time for a green light that means nothing.
