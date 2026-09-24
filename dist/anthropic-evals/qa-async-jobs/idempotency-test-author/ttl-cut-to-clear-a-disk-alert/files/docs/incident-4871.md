# INC-4871 - customers charged twice, 2026-06-14

**Impact:** 11 customers, 14 duplicate charges, 3,180 GBP refunded.

**Sequence.** A deploy at 21:40 left the payments pod unable to reach NorthPay
for 19 minutes. Requests timed out rather than failing fast. NorthPay retried on
its published schedule. The pod recovered at 21:59.

Nine of the duplicates were attempt 4, 45 minutes after the original. Two were
attempt 5, arriving **3 hours and 4 minutes** after the original request. In
every case the retry carried the original `Idempotency-Key`; the reason the
charge went through twice was that our own dedup entry had been evicted early by
a memory-pressure eviction policy we have since removed.

**Action taken:** eviction policy changed to `noeviction`, TTL confirmed at 24h,
alerting added on key-store memory. No duplicate charges since.
