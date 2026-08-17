# Failed subscription payments (runbook, v2)

When a charge fails because of insufficient funds, retry the card after three
days.

When a charge fails because the card has expired, do not retry. Email the
customer to ask them to update the card.

When a backup card is on file, charge the backup card immediately instead of
retrying the primary. A successful backup charge closes the incident: no grace
period runs and no dunning email is sent.

Annual plans get a 14-day grace period before the account is suspended. Monthly
plans get 5 days.

On the third failed attempt within a billing cycle the account is suspended,
whatever the plan's grace period says.

An account that was suspended in an earlier billing cycle is suspended on the
first failure instead of the third.

Only two decline reasons reach this runbook: insufficient funds and expired
card. Anything else is handled by the provider.
