# warehouse group - hosts and the crontab they carry

Both hosts are in the `warehouse` Ansible group and take the same role. The role
was applied to the group when wh-worker-05 was added on 2026-06-02.

| Host         | Address    | Role applied | Notes                          |
|--------------|------------|--------------|--------------------------------|
| wh-worker-02 | 10.4.2.12  | 2026-04-14   | original worker                |
| wh-worker-05 | 10.4.2.15  | 2026-06-02   | added for the migration        |

The crontab the role writes, identical on both hosts, currently commented out:

    # */10 * * * * /usr/local/bin/warehouse-sync --lock /var/run/warehouse-sync.lock >> /var/log/warehouse-sync.log 2>&1

`/var/run` is tmpfs on both hosts. Nothing is mounted between them; the
warehouse database is the only thing they share.
