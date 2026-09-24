# ci-shared-02, notes for the e2e job

Written 2026-09-09 by platform ops. We are not going to tell you what to do with
the suite; these are the measurements you asked for.

## Host memory during the 2026-09-08 run

`free -m` sampled every 30 s for the whole run. Peak line:

```
              total        used        free      shared  buff/cache   available
Mem:           7982        3106        1204        2044        3672        4590
```

The box has never gone into swap. The host has 8 GB.

## Inside the job container, same run

```
$ docker exec ci-e2e-runner df -h /dev/shm
Filesystem      Size  Used Avail Use% Mounted on
shm              64M   64M     0 100% /dev/shm
```

That is what the container was given when it was created; nothing in our job
definition sets it. We can put any value we like on that container — it is one
line in the job definition and it costs nothing, but we are not going to change
it on a hunch, so tell us whether it is worth doing.

## Pricing, since you asked

The 16 GB runner class is £812 per runner per month. You have three runners.
That is a purchase order and a month of lead time.

## One more thing

ci-shared-01 runs the API suite only and has never raised any of this. Same
image, same host class, same container settings.
