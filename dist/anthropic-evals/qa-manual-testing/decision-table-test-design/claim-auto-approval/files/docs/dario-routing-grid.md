# Claim routing grid - for QA sign-off

Sixteen combinations of the four triage inputs reduce to four rows. `-` means
the input does not change the outcome.

| row | amount <= EUR 1,000 | policy >= 6 months | photo attached | garage estimate | outcome |
|---|---|---|---|---|---|
| R1 | yes | yes | yes | - | approved automatically |
| R2 | yes | yes | no | - | held, customer emailed for a photo |
| R3 | no | yes | - | - | human adjuster |
| R4 | - | no | - | - | fraud review |

**How the reduction was done.** Two of the four inputs are attached documents,
and the note is explicit that documents do not steer a claim: "the handler opens
the file either way". So once a claim is going to a person, neither the photo nor
the garage estimate changes anything, which collapses R3 and R4 to one row each.
On the automatic path the amount and the policy age have already decided the
outcome, so the estimate is irrelevant there too.

Four rows, four claims to file. QA can be through this in a morning.

- Dario
