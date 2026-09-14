# Reply to the tooling memo - risk-scoring

From: H. Okonkwo, risk-scoring tech lead
Date: 2026-09-08

We are not reimplementing `kestrel_sig` in JavaScript. Crypto have said no in
writing, and my four people write Python all day and no JS at all.

The alternative is obvious and I already have it running: drive the scoring
endpoint from a Python load tool and import `kestrel_sig` directly, so the test
signs exactly the way production signs. One dependency, no second implementation,
nothing new for crypto to audit. That is the memo's actual objection dealt with.
The test file is on my branch at `tests/load/locustfile.py`.

R2 is covered too - the runner exits non-zero by itself, so CI goes red with no
parser anywhere. This is what I ran on Tuesday and it is what I would put in the
pipeline as-is:

```
locust -f tests/load/locustfile.py \
  --users 200 --spawn-rate 20 --run-time 10m \
  --host https://staging.risk.internal \
  --exit-code-on-error 1
```

The end-of-run table runs to a few thousand lines now, which is mildly annoying,
but the Aggregated row came out at p99 108 ms against the 120 budget, so we are
inside it with room to spare. That is D. Aroyo's gate, met, without anybody writing
a line of result-parsing code.

If platform agree, I would like this signed off this week so we can stop discussing
it.
