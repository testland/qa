# Client-side close events, collected by the web client's error reporter

One line per ended connection, sampled at 2%.

## Rollout 2026-09-04, 20:02-20:05 UTC - before the hotfix

```
20:02:41  session=9f31 code=1008 clean=true  reason="duplicate session"
20:03:07  session=1a04 code=1011 clean=true  reason="internal error"
20:04:12  session=77bc code=1006 clean=false reason=""
20:04:12  session=2e91 code=1006 clean=false reason=""
20:04:13  session=0c7a code=1006 clean=false reason=""
```

Banner impressions in the window: 9,318. Drafts restored from local storage: 0.

Old pod shutdown log:

```
20:04:11  SIGTERM received, entering drain
20:04:11  drain: 9412 connections
20:04:12  drain complete in 411ms
20:04:12  process exit 0
```

## Rollout 2026-09-12, 19:31-19:34 UTC - after the hotfix

```
19:31:58  session=b2d5 code=1008 clean=true  reason="duplicate session"
19:33:40  session=44a1 code=1006 clean=false reason=""
19:33:40  session=8e02 code=1006 clean=false reason=""
19:33:41  session=c117 code=1006 clean=false reason=""
```

Banner impressions in the window: 9,104. Drafts restored from local storage: 0.

The client's reporter records `event.code` and `event.wasClean` exactly as the
browser hands them over; it does not synthesise either field.
