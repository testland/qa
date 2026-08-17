# Nine steps, no way to tell whether any of them passed

## Problem Description

`qa/activation-steps.md` is what we hand to whoever is covering eSIM activation
this sprint. Not one of its nine steps says what should happen. The tester taps
things and then decides for themselves whether the phone looks activated.

It also assumes things the tester has no way to know: which handset, which
network state the phone should be in at each point, and "the usual test SIM",
which meant something to the two engineers who built the feature and nothing to
anyone since. A contractor last month burned four activation codes working out
that the download and the service check need opposite Wi-Fi settings.

When something did go wrong, the defect went into a Slack thread that has since
rolled out of retention, so the fix was never reproduced and the case has been
passing ever since without anybody being sure the original problem is gone.

We need a case a tester can pick up cold, and a run that leaves a record.

## Output Specification

Produce one markdown document at exactly `qa/TC-esim-activation.md` containing:

1. An activation case that someone who has never seen the feature can execute
   without asking a question or making a judgement call.
2. Everything that must be true before the first step - handset, software, network
   state, and the exact activation credential to use, taken from the attached
   files.
3. For each step, the single thing on the device that decides pass or fail.
4. Whatever must happen after the last step so that the next tester can run the
   case too.
5. A place to record what went wrong, structured so an engineer can reproduce it
   from the record alone.

Out of scope: automating the case, physical SIM activation, and anything to do
with billing.

## Input Files

Extract the following files before beginning.

=============== FILE: qa/activation-steps.md ===============
# eSIM activation

1. Get the usual test SIM.
2. Open the app.
3. Go to Add a plan.
4. Scan the code.
5. Wait.
6. Tap Activate.
7. Check it works.
8. Make a call.
9. Done.

=============== FILE: qa/device-lab.md ===============
# Device lab and activation stock

Lab location: 3rd floor cabinet, key with the office manager.
App under test: Kestrel Mobile, build 7.4.0 (shown in Settings > About).

## Handsets

| Device            | OS           | Carrier app | Usable for eSIM        |
|-------------------|--------------|-------------|------------------------|
| iPhone 14         | iOS 18.4     | 7.4.0       | yes                    |
| Pixel 8           | Android 15   | 7.4.0       | yes                    |
| Galaxy S23        | Android 14   | 5.9.2       | no - eSIM download     |
|                   |              |             | needs carrier app 6.2+ |

## Activation codes

Twelve QR activation codes were issued for this quarter. Each one can be
downloaded onto a device exactly once; once used it is dead, and deleting the
profile from the handset does not release it.

The consumed/unconsumed state is tracked in `qa/esim-code-tracker.md`. Codes
`ESIM-Q3-01` through `ESIM-Q3-05` are marked consumed. `ESIM-Q3-06` through
`ESIM-Q3-12` are unconsumed. The tracker is only correct if the tester marks
the code they used.

## Network conditions

The profile download goes over IP, so the handset needs Wi-Fi on for that
part. Verifying that the new plan actually carries service requires Wi-Fi off,
otherwise calls and data ride the office network and the check proves nothing.

Lab Wi-Fi: `kestrel-lab`, password on the cabinet door.

## What a successful activation looks like

- The plan appears under Settings > Mobile Service as "Kestrel 20GB".
- The status bar shows the carrier name "Kestrel" with at least one bar.
- The app's home screen shows the plan name and a remaining-data figure.
- A test call to the lab echo line 0800 555 0101 connects and plays back
  audio.
- Activation SMS from short code 1717 arrives within two minutes.
