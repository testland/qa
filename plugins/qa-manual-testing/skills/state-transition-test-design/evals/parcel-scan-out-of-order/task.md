# A delivered parcel went back out for delivery

## Problem Description

Tracking status on a parcel is driven entirely by scans from courier
handhelds. A parcel is in transit while it moves between hubs, goes out for
delivery when it is loaded onto a van, and is delivered when the courier
confirms it at the door. A delivery that does not happen sends the parcel back
to the depot to try again the next day. A parcel that cannot be delivered at
all - refused, address wrong, unclaimed after three attempts - is scanned for
return and goes back to the sender. Delivered and returned to sender are both
the end of the parcel's tracking life; the tracking page then just shows the
final scan and the proof of delivery photo.

The handhelds do not have a reliable data connection. Scans are queued on the
device and uploaded whenever it finds signal, which for rural rounds means the
whole day's scans land in one burst at 18:00, in whatever order the upload
happened to serialise them. A scan taken at 09:00 can therefore arrive after a
scan taken at 15:00.

That is how last month's incident happened. A parcel was delivered at 11:40
and the confirmation uploaded straight away. The same courier's failed-delivery
scan for the previous attempt uploaded at 18:00, the tracking service applied
it, and a delivered parcel went back to in transit and was loaded onto a van
again the next morning. The customer had already had it for a day.

We have a test pack. It follows a parcel from a hub, onto a van, to the door.
It passes.

## Output Specification

Produce `docs/parcel-tracking-tests.md` containing:

1. The model the cases come from: for each tracking status, what the tracking
   service does with each scan type it can receive - remembering that any scan
   type can arrive in any status because of the upload delay.
2. Numbered manual test cases with steps and per-step expected results,
   written against what the customer-facing tracking page shows.
3. A one-line note per case saying which real-world upload situation it
   stands in for.

Proof-of-delivery photos, the handheld software, and hub sortation are out of
scope. Do not write code.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/tracking-statuses.md ===============
# Parcel tracking - status model

## Statuses shown on the tracking page

| Status | Customer sees |
|---|---|
| InTransit | "On its way" plus the list of hub scans |
| OutForDelivery | "Out for delivery today" plus the courier's name |
| Delivered | "Delivered" plus time and photo |
| ReturnedToSender | "Returned to sender" plus the reason code |

## Scan types the tracking service accepts

| Scan | Taken by |
|---|---|
| hub-scan | Hub scanner as the parcel is sorted |
| loaded-for-delivery | Courier, loading the van in the morning |
| delivery-confirmed | Courier, at the door |
| delivery-failed | Courier, at the door, with a reason code |
| return-scan | Hub or courier, starting the return leg |

Five scan types, and no other input changes a parcel's status.

## Rules

- Every hub a parcel passes through adds a scan line to the tracking page.
- Loading a parcel onto a van puts it out for delivery.
- A confirmed delivery ends the parcel's journey.
- A failed delivery sends the parcel back to the depot for another attempt.
- A return scan sends the parcel back to the sender and ends its journey.
- A hub scan on a parcel that is on a van is a mis-scan: hub scanners are not
  supposed to see it, and operations wants those refused rather than silently
  applied.
- The tracking page is public. Whatever it says is what the customer believes.
