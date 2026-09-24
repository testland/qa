# Connection table, gateway pod 7 of 12, sampled 2026-09-13 09:00 UTC

| bucket, time since last inbound byte | connections | presence shown |
|--------------------------------------|-------------|----------------|
| < 1 min                              | 12,880      | online         |
| 1-15 min                             | 2,206       | online         |
| 15-60 min                            | 0           | online         |
| 1-6 h                                | 16,578      | online         |
| 6-24 h                               | 7,890       | online         |
| > 24 h                               | 1,650       | online         |

Outbound is healthy on all of them: the pod is still writing a frame to each
connection every 30 seconds and none of those writes fail. The 15-60 minute
bucket is empty because a real user either comes back inside fifteen minutes or
does not come back at all.
