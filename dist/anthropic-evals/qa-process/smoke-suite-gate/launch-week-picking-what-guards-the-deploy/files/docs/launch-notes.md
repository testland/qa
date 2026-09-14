# Launch pipeline — what is already decided

## Stages

| Stage | What happens |
|---|---|
| Pre-merge on a PR | build, deploy to an ephemeral environment, run the deploy check, tear down |
| Post-merge to main | deploy to staging, run the deploy check against staging |
| Production deploy | deploy, then run the deploy check against production |

The pipeline job is capped at 10 minutes end to end. The ephemeral deploy inside
it takes about 4 minutes and the platform team says that is not moving before
launch. The gate box is a single runner with one worker, so plan on serial time.
We deploy about nine times a week now and expect more after launch.

## Environments

- **Ephemeral and staging** carry a carrier sandbox: shipments booked there are
  fake, cost nothing, and are swept nightly. Payment is test mode
  (`STRIPE_TEST_SECRET`); card `4242 4242 4242 4242` authorises.
- **Production** carries a verification account `verify@trellis.io` holding the
  same rights as any customer account, a seeded closed shipment `TRL-SEED-2`
  and a seeded past booking `TRL-SEED-9`. Payment is live mode
  (`STRIPE_LIVE_SECRET`). Finance has put a company card on the verification
  account so that checks against production do not need anybody's own card.

## The four asks

- **Ray (Finance):** "Put a real card through production on every deploy. Test
  mode told us the payment page was fine for three weeks in July while live
  mode was returning 402 on every Amex. I do not care what the sandbox says, I
  want to know money actually moved. The card is on the account already, the
  charge is £1, and I will reconcile them monthly."
- **Nadia (Support):** "Admin bulk-delete. We broke it twice in beta and each
  time it took a week to notice."
- **Tom (Growth):** "Referral invites. The whole launch campaign is built on
  them and if they stop sending we lose the window."
- **Ana (Product):** "Shipment tracking. Half of beta support volume is people
  asking where their courier is — if tracking breaks we will know about it in
  an hour and it will be a bad hour."
