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
