# 31 Oct and 1 Nov

31 Oct: customers got duplicate invoices. Logs: pod-a took the lock at 02:00:00, pod-b took the
lock at 02:05:01 and also generated invoices, pod-a finished at 02:09:12.

1 Nov: pod-b took the lock at 02:00:00 and was OOM-killed at 02:01. pod-a and pod-c logged
"another instance is running, skipping". No invoices were generated for that night until
someone noticed two days later.
