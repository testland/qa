# #fraud-oncall, 2026-09-07

**08:30 Dinara (Head of Risk)** Four drift alerts in one night. The model is
stale - it was trained on July and August and the world has moved. I want a
retrain kicked off today on the last two weeks and a candidate in front of me by
Wednesday. Please confirm by 14:00.

**08:34 Wagner (Payments Platform)** A-2 is the holiday. Sunday night into
Independence Day, everyone is buying different things at different hours. Mute
`amount_brl`, `basket_size`, `hour_of_day`, `mcc_category` until Thursday and it
will clear itself. A-4 is the same story a few hours later as far as I can see.

**08:41 Dinara** If Wagner is right about A-2 and A-4 that is two alerts, not
four, and it is still two more than we usually get.

**08:52 Lia (DS)** For what it is worth I re-ran the pinned reference against the
v12 eval slice this morning and it comes back almost entirely clean, so whatever
is happening does not show up in the data we train on.

**09:05 Dinara** Then retrain on serving data. I do not mind which, I mind that
we have a model scoring live money against a distribution nobody can vouch for.

**09:11 on-call (you)** Give me until 14:00.
