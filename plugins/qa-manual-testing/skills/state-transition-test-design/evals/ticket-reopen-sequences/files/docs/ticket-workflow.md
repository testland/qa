# Helpdesk ticket workflow

## Statuses

| Status | Meaning |
|---|---|
| New | Arrived, nobody owns it |
| Open | With an agent, agent's move |
| PendingCustomer | With the customer, waiting on their reply |
| Resolved | Agent believes it is done; auto-close clock running |
| Closed | Finished. Read-only for the customer. |

## Events the helpdesk handles

| Event | Trigger |
|---|---|
| assigned | Agent or round-robin rule takes/moves ownership |
| agent-replies | Agent posts a public reply |
| customer-replies | Customer posts from the portal or by email |
| agent-resolves | Agent marks resolved |
| customer-reopens | Customer clicks Reopen on a resolved ticket |
| auto-close-timer-expires | Scheduler, 72h after the ticket was resolved |
| agent-closes | Agent closes the ticket outright |

## Rules

- Only an assigned ticket can be replied to or resolved. An agent cannot
  resolve a ticket nobody owns.
- Handing a ticket to another agent does not change what it is waiting on.
- A customer reply on a ticket that is waiting on them brings it back to the
  agent.
- The portal's reply box is disabled on a resolved ticket. Reopen is the only
  way back in.
- Reopen is offered on resolved tickets only.
- A closed ticket is finished. There is no reopen on it and the customer is
  told to raise a new one.
- The first-response clock starts when a ticket lands with an agent and stops
  on that agent's first public reply.
- The auto-close clock starts when a ticket is resolved and runs for 72 hours.
