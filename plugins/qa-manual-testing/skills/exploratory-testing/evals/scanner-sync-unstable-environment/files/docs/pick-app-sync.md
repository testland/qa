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
