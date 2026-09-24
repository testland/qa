# from @ravi — 2026-09-12 08:58

Three of these have to come off the blocking path tonight. I have the 18:00
window. Taking them in the order they hurt:

1. `not_null` on `fct_shipments.delivered_at`. Fires every single night without
   exception. This is not a defect, it is physics — a parcel that has not arrived
   yet does not have a delivery date. `mart_delivery_sla` has been rebuilt by hand
   every morning for nine days and the ops team has stopped trusting it.

2. `unique` on `stg_web_sessions.session_id`. Fires most nights, somewhere between
   a few hundred and about a thousand. Marketing has never once come to us with a
   number they thought was wrong. I do not know the cause and I have not had a
   spare day to go and find out.

3. `relationships` from `fct_orders.account_id` to `dim_accounts`. This one is the
   CRM sync and nothing else. The sync runs at 03:15, our build starts at 03:00,
   so every night we ask about accounts that have not landed yet. They are all
   there by 06:00 — check any morning you like. Smallest count of the three by a
   mile and the most obviously harmless of the lot.

I am not asking for any of these to be deleted. Warn instead of error, all three,
and I will come back to them properly when I am off the rotation.
