From:    Anneke Voss (support ops)
To:      all-engineering
Date:    2026-08-03
Subject: One urgency field from today

Short version: severity is gone from intake. Everything carries one urgency, P0 to P3.

I looked at every defect we closed in the last four quarters - 1,120 of them - and
mapped severity onto priority. They land on the same band 94.2% of the time. We are
paying twice for one judgement: about 38 seconds per item at intake, and a five minute
argument at triage whenever somebody disagrees with themselves about which is which.

The intake module and the pre-filing gate are already updated. The old severity key
still parses so nothing breaks, it just is not stored any more.

If someone wants the second field back, the bar is a case that the 5.8% is worth the
94.2%.
