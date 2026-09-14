# Reply to the tooling memo - risk-scoring

From: H. Okonkwo, risk-scoring tech lead
Date: 2026-09-08

We are not reimplementing `kestrel_sig` in JavaScript. Crypto have said no in
writing and my four people write Python all day and no JS at all.

The alternative is obvious and I already have it running on my laptop: drive
`POST /v1/score` from a Python load tool and import `kestrel_sig` directly, so
the test signs exactly the way production signs. One dependency, no second
implementation, nothing new for crypto to audit. That is the memo's actual
objection dealt with.

R2 is covered too. The runner exits non-zero by itself, so CI goes red with no
parser anywhere. This is what I ran on Tuesday and it is what I would put in the
pipeline as-is:

```
locust -f tests/load/locustfile.py \
  --users 200 --spawn-rate 20 --run-time 10m \
  --host https://staging.risk.internal \
  --exit-code-on-error 1
```

That gives D. Aroyo his 120 ms p99 gate without anybody writing a line of
result-parsing code. If platform agree, I would like this signed off this week so
we can stop discussing it.
