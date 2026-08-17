# Three pairing bugs hid behind one ticket

## Problem Description

The app pairs with our Bluetooth kitchen scale. The user opens the Devices
screen and taps Scan, the app lists nearby scales, the user picks one, the
scale shows a six digit code on its display, and the user types it into the
app. If the code matches, the scale is paired and starts streaming weight
readings. If it does not match, pairing is abandoned and the user is back to
where they started with no device.

Bluetooth being what it is, the connection drops constantly. A drop during the
scan or during the code entry throws the user back to having no device. A drop
on a paired scale is different: the scale stays paired but shows as
unavailable until the user taps Scan again to go looking for it.

The Scan button is disabled while a scan is already running, and the app hides
the device list once a device has been picked. That is the UI. The pairing
service underneath still receives events from the Bluetooth stack, and the
stack delivers them late, out of order, and sometimes twice - a code result
for a pairing attempt the user abandoned thirty seconds ago will still arrive.

Last release QA raised one ticket, "app misbehaves when stale pairing events
arrive", listing six things to try in a single reproduction. A developer fixed
the first thing on the list, the ticket was retested and passed, and two of the
remaining five were found by a customer a month later. We would like the pack
written so that cannot happen again.

## Output Specification

Produce `docs/pairing-tests.md` containing:

1. The model you worked from: for each situation the device can be in, what
   the pairing service does with each event the Bluetooth stack can deliver.
2. Numbered manual test cases with steps and per-step expected results,
   including what the Devices screen shows.
3. For each case, the precondition that puts the device in the right situation
   before the case begins.

Each case must be able to fail for exactly one reason.

Firmware behaviour, weight accuracy, and the Bluetooth stack itself are out of
scope. Do not write code - the team runs these by hand against a real scale.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/pairing-service.md ===============
# Pairing service - mobile app

## Situations the app tracks per device

| Situation | Devices screen shows |
|---|---|
| Unpaired | "No scale connected" and a Scan button |
| Discovering | Spinner and a growing list of nearby scales |
| Pairing | Code entry field, six digits |
| Paired | Scale name, battery level, live weight |
| Unavailable | Scale name greyed out, "Out of range", Scan button |

## Events the pairing service receives

| Event | Delivered by |
|---|---|
| scan-started | User taps Scan |
| device-selected | User taps a scale in the list |
| code-accepted | Bluetooth stack, after the scale validates the code |
| code-rejected | Bluetooth stack, after the scale rejects the code |
| connection-lost | Bluetooth stack, on link loss or adapter off |

These five are the only events the service handles. The stack does not
guarantee ordering and reissues events on reconnect, so any of the five can
arrive in any situation.

## Behaviour the team agreed

- Tapping Scan on a device with no scale starts discovery.
- Picking a scale from the list starts pairing and the scale displays a code.
- A code the scale accepts pairs the device and weight streaming begins.
- A code the scale rejects abandons pairing; the user has no scale again.
- A lost connection while discovering or pairing abandons what was in
  progress; the user has no scale again.
- A lost connection on a paired scale leaves it paired but out of range.
- Tapping Scan again on an out-of-range scale goes looking for it.
- The Scan button is disabled while discovery is running.
- The device list disappears once a scale has been picked.

## Note from the developer who fixed last release's ticket

The situations above are what the app renders. The stack's own connection
states (`CONNECTING`, `BONDED`, `DISCONNECTED_TIMEOUT`) are not the same thing
and are not visible anywhere in the UI.
