From: Renata Oyelaran
Subject: three things before the postmortem

I have looked at this for two days. Three things, and I would like all three in
before Thursday.

1. Put a hard number on it. MAE under 6 minutes or we get woken up. Six is
   roughly where the complaints started, and a monitor that cannot produce a
   number anyone can argue about is not a monitor.

2. Clear out `monitoring/baselines/` and reseed it from August traffic. Whatever
   is in there is months old at this point and half the columns will scream the
   moment we start looking properly, which is exactly the noise that gets a
   monitor muted. Start from something current and clean.

3. Drop `store_id` and `courier_tier` from the monitored set. They are
   high-cardinality categoricals, they are the only two that ever wobble, and
   they have never once meant anything. Fewer columns, fewer false alarms.
