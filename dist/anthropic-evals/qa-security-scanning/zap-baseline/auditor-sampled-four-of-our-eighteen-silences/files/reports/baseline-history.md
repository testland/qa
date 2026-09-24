# Commit history of the accepted-findings list

Pasted from the terminal on 2026-09-12, unedited.

```
$ git log --date=short --format='%h %ad %an  %s' --numstat -- .zap/baseline-findings.json

4a1f0c9 2026-09-07 dast-bot  chore(dast): weekly baseline refresh
0	0	.zap/baseline-findings.json

d70b2e5 2026-08-31 dast-bot  chore(dast): weekly baseline refresh
0	0	.zap/baseline-findings.json

9c33ab1 2026-08-24 dast-bot  chore(dast): weekly baseline refresh
0	0	.zap/baseline-findings.json

b62d918 2026-08-03 dast-bot  chore(dast): weekly baseline refresh
15	0	.zap/baseline-findings.json

e08d441 2026-07-27 dast-bot  chore(dast): weekly baseline refresh
0	0	.zap/baseline-findings.json

5510ff2 2026-06-15 dast-bot  chore(dast): weekly baseline refresh
5	0	.zap/baseline-findings.json

71c4ee0 2026-05-11 r.oke  chore(dast): accept current findings and switch the check on
6	0	.zap/baseline-findings.json
```

Runs of `DAST baseline refresh` between 2026-05-11 and 2026-09-12: 18 scheduled,
0 manual. No run has failed.
