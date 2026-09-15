# Ticket 4416 - customer charged twice, four days apart

Gateway request log, filtered to customer `cus_71f2`. Amounts in cents.

| received | amount | Idempotency-Key | gateway result |
|---|---|---|---|
| 2026-07-02 09:14:06 | 1999 | 6f1c9a02-3f7d-4a11-9c2e-0b5d21ac77e1 | accepted; our HTTP client timed out waiting for the body |
| 2026-07-06 03:10:41 | 1999 | b84e37dd-19a5-4c83-a0f7-6e41d9b2c015 | accepted |

Both rows are the same logical charge. The 07-02 submission was recorded as
retryable after the timeout and the pending item sat in the queue while the
gateway was unreachable, so the batch re-submitted it on 07-06.

The two earlier tickets have the same shape. Key pairs as recorded in their
ticket bodies:

- 4318, two days apart: `1d40b7c6-8b2a-4d6f-9e30-72ff10c8a5b3` then
  `9ac21e58-6d14-42b7-b8c1-f0a934e27d86`
- 4377, five days apart: `c2e7f0b4-5a19-4f28-8d63-11be72c4900a` then
  `40db6a19-7c52-4e90-95ab-3d7f6021ec48`
