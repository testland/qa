# Local reproduction attempt — d.volkov, 2026-09-13 08:40 UTC

Checked out `b93d0c7~1`, pasted the exact line from `b93d0c7` back into
`services/notify/mailer.env.sample`, staged, committed.

```
$ git add services/notify/mailer.env.sample docs/incident-notes.md
$ git commit -m "repro"
Detect hardcoded secrets.................................................Failed
- hook id: gitleaks
- exit code: 1

    Finding:     SENDGRID_API_KEY=SG.[REDACTED]
    Secret:      REDACTED
    RuleID:      sendgrid-api-token
    File:        services/notify/mailer.env.sample
    Line:        9
    Fingerprint: <staged>:services/notify/mailer.env.sample:sendgrid-api-token:9
```

Blocked first try. Ran it three more times — same content, then with the key
split across two lines, then with it at the end of the file. Blocked every
time, always on `sendgrid-api-token`, always with the same finding line. I
cannot get this thing to let the key through on my machine.

`pre-commit --version` 4.0.1. Hook env resolved to gitleaks v8.24.2, the
version pinned in the config. I have had `docs/incident-notes.md` staged in the
same commit all morning — I have been living in that file since the page — but
I cannot see how my notes would change what the scanner does with the env file.
