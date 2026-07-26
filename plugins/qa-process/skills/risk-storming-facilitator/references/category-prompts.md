# Risk-storming category prompts

The facilitator brings prompts to drive the silent brainstorm and the
discussion that follows. The categories align with the risk categories
in `risk-matrix`. These are starters; participants extend each per the
feature under review.

## Business risks

- "What if the calculation is off by a cent?"
- "What if a customer applies the same code twice?"
- "What if the discount stacks differently than expected?"
- "What's the worst incorrect outcome the customer would see?"

## Technical risks

- "What if the third-party API is down?"
- "What if the DB migration runs partially?"
- "What if two users hit this concurrently?"
- "What's the longest-running query under this feature?"

## Regulatory / compliance risks

- "What if this stores PII?"
- "What if the user is in EU / California?"
- "Are there regional pricing requirements?"

## UX risks

- "What if the user's network is 3G?"
- "What if the user is using a screen reader?"
- "What's the first-time user experience?"

## Security risks

- "What if an attacker controls the input?"
- "What if a logged-in user accesses another user's data?"
- "Where's the auth boundary?"

## Performance risks

- "What's the cold-start time?"
- "What's the per-request latency budget?"
- "What's the concurrent-user ceiling?"
