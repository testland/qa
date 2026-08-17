# Night shift says the handheld counts some totes twice

## Problem Description

A shift supervisor at the distribution centre left a handwritten note for the
systems team about the handheld picking app double-counting totes. Someone
transcribed it into our inbox this morning along with an export of everything
currently open in the tracker for that app, because the systems team has been
burned before by filing the same floor complaint three times under three
different wordings.

The note is short and written by someone who was mid-shift. It does not say
which of the two handheld fleets was involved, what app version they are on, or
how often it happens — the pickers have a workaround and have stopped mentioning
it, which is its own problem.

The systems team's standing instruction: before anything new goes into the
tracker, check it against what is already open there, and if it is the same
thing, add to that instead of creating another entry.

## Output Specification

1. Write `reports/handheld-double-count.md`.
2. The document must state plainly what should happen to this in the tracker and
   why, based on what is already open.
3. Whatever is still needed from the floor before anyone can act must be in the
   document, phrased so a supervisor with two minutes can answer it.

Out of scope: opening the tracker yourself, reading the handheld app source, or
proposing a fix.

## Input Files

Extract the following files before beginning.

=============== FILE: inbox/floor-note.md ===============
Transcribed from a handwritten note left on the systems desk, 2026-08-14 06:10.
Transcriber: J. Whitfield (day shift lead). Original note is in the tray.

  "Night shift again — the guns are counting some totes twice on the pick
  confirm. Not every tote. The lads just back out and scan again so the count
  comes right in the end but it's slowing them and one of them says it put a
  tote on the wrong pallet last week because of it. Happens more down the far
  aisles. Can someone look."

  — signed, Ade (supervisor, nights)

Transcriber's note: Ade has gone home, back Sunday night. We run two handheld
fleets on the floor (the older ones and the batch we bought this spring) and the
note doesn't say which. No app version on the note. I don't know which aisles
"the far aisles" means — could be F through K, could be the cold section.

=============== FILE: inbox/open-defects-export.md ===============
Export: open items, Ridgeline WMS handheld app — pulled 2026-08-14 07:02

WMS-2118  Pick confirm screen rotates to landscape on some devices    open   P3
WMS-2214  Scan counted twice when trigger held during Wi-Fi handoff   open   P2
          - reported by nights supervisor in March
          - 3 duplicate reports already merged into this one
          - last comment 2026-06-30: "reproduced on the older fleet at the
            aisle-J access point; not reproduced on the spring fleet"
          - no fix scheduled; waiting on network team for AP roaming config
WMS-2287  Battery percentage reads 100% until it drops to 40%         open   P3
WMS-2301  Tote label prints without the check digit on reprint        open   P2
WMS-2350  Pick list refuses to load after a shift handover            open   P1
WMS-2361  App logs out mid-pick when the device sleeps                open   P2
