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
