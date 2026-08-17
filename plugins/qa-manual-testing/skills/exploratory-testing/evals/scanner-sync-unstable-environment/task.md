# Three hours of contractor time on an environment that keeps falling over

## Problem Description

Our warehouse picking app is a browser app running on handheld Android
scanners. Pickers work in cold storage where wifi is patchy, so the app
queues scans locally and syncs when it reconnects. That queue is what we are
worried about: a customer reported two picks that never reached the
warehouse system last month, and we could not reproduce it.

Tomas is a contractor. He has three separate 60-minute blocks on Tuesday -
09:00, 13:00 and 15:30 - and he invoices by the hour. The last engagement he
billed three hours and handed back a page of notes; I had no way to tell how
much of that was actual testing and how much was fighting the lab.

The lab is genuinely bad. The warehouse-system sandbox reboots on its own
schedule, roughly twice a day, and comes back with an empty pick list.
Provisioning a handheld with a fresh build takes between five and twenty
minutes depending on whether the MDM cooperates. On a bad morning that can
eat most of an hour.

The warehouse system itself belongs to the 3PL vendor. Tomas tests our app
and the sync behaviour; he does not raise tickets against their system and
does not test their screens.

I need to know, per block, whether what he found is worth trusting - and I
need a rule for what happens when a block goes badly, agreed up front, not
argued about on the invoice.

## Output Specification

Produce a single file: `docs/qa/scanner-sync-tuesday.md`.

It must contain:

1. One stated objective for each of the three blocks: the area, what he
   works with, and what we need to learn.
2. How each 60-minute block is accounted for afterwards, broken into
   categories that separate real testing from environment and setup work
   from chasing down a suspected defect.
3. A stated threshold at which a block's findings are not trustworthy, what
   Tomas does when he hits it during the block, and what happens to that
   block afterwards.
4. What Tomas records during a block, split so a reader can tell apart
   defects in our app, problems with the lab that cost him time, and things
   that need a decision from us.
5. The hand-back per block: what was covered, what was found, what was not
   reached, and his own read on the queue's reliability.
6. Who reviews the hand-backs, when, and how that ties to the invoice.

Available: three 60-minute blocks on one Tuesday, one contractor. Out of
scope: the 3PL warehouse system's own screens and defects, barcode hardware
firmware, and anything requiring a code change.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/pick-app-sync.md ===============
# Picking app - offline sync notes

**Client:** browser app installed to the handheld home screen, Android 11
handhelds, Zebra TC21.

## Sync model

- Every scan is written to a local queue with a client-generated id and a
  timestamp from the device clock.
- A background task flushes the queue to the warehouse system every 20
  seconds when online, oldest first.
- The warehouse system replies with an accept or a reject per item. Rejects
  stay in the queue and are retried five times, then moved to a dead list
  visible on a hidden diagnostics screen.
- The queue holds a maximum of 500 scans. Beyond that the oldest are
  dropped and a banner appears.
- Logging out is blocked while the queue is non-empty. Force-closing the
  browser is not blocked.

## Suspected weak points

- Device clocks drift in cold storage; two handhelds were found 4 minutes
  out. Ordering is by device timestamp, not arrival.
- The dead list is not surfaced anywhere a picker would see it.
- A handheld that goes offline mid-flush can leave a scan that was accepted
  by the warehouse system still marked pending locally, so it is sent again
  on reconnect.
- Nobody has tested the 500-scan cap on a real handheld.

## Lab conditions

- Warehouse-system sandbox: reboots roughly twice daily, unannounced; pick
  lists must be re-seeded manually after each reboot (about 10 minutes).
- Handheld provisioning via MDM: 5 to 20 minutes per device.
- Wifi can be dropped from the handheld's own settings; there is also a
  shielded box in the lab for a hard signal cut.
- Two handhelds are available on Tuesday. One has a known cracked scanner
  window that misreads about one barcode in ten.
