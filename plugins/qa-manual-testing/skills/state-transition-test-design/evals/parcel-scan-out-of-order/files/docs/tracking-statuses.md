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
