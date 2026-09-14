# Client-side close events, rollout window 20:02-20:05 UTC

Collected by the web client's error reporter. One line per ended connection,
sampled at 2%.

```
20:02:41  session=9f31 code=1008 clean=true  reason="duplicate session"
20:03:07  session=1a04 code=1011 clean=true  reason="internal error"
20:04:12  session=77bc code=1006 clean=false reason=""
20:04:12  session=2e91 code=1006 clean=false reason=""
20:04:12  session=b350 code=1006 clean=false reason=""
20:04:13  session=0c7a code=1006 clean=false reason=""
20:04:13  session=41ff code=1006 clean=false reason=""
20:04:14  session=d208 code=1006 clean=false reason=""
```

Banner impressions in the same window: 9,318. Drafts restored from local
storage: 0 - the client only keeps the composer when the ending was clean.

The old pod's shutdown log for the same window:

```
20:04:11  SIGTERM received, entering drain
20:04:11  drain: 9412 connections
20:04:12  drain complete in 411ms
20:04:12  process exit 0
```
