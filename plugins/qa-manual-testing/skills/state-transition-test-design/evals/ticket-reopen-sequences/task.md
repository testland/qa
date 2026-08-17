# Reopened tickets close themselves twenty minutes later

## Problem Description

Our helpdesk moves a ticket through five statuses. A ticket arrives new, an
agent picks it up and it is open, the agent replies and it waits on the
customer, the agent resolves it, and 72 hours later it closes itself unless
the customer comes back. A customer who is not satisfied can reopen a resolved
ticket from the portal, which puts it back with the agent.

We have two SLA clocks. The first-response clock runs from the moment a ticket
lands with an agent until that agent's first reply. The auto-close clock runs
from the moment a ticket is resolved.

Two incidents last month, both from reopened tickets. In the first, a customer
reopened a ticket and it closed itself twenty minutes later - the auto-close
deadline from the first resolution was still sitting on the record. In the
second, a reopened ticket showed its first-response SLA as already breached
the instant it reopened, because the clock had never been restarted, and it
went to the top of the escalation report.

Our regression pack has one case per status change and every one of them
passes. Both incidents happened anyway, because a ticket that is open because
it was just reopened is not the same as a ticket that is open because it was
just assigned, and nothing in the pack distinguishes those.

## Output Specification

Produce `docs/ticket-lifecycle-tests.md` containing:

1. The model the cases come from: for each status, what each of the events the
   helpdesk handles does to a ticket.
2. Numbered manual test cases with per-step expected results. The expected
   result of each step must state the ticket's status and, where a clock is
   involved, what the SLA panel should read.
3. Cases that would have caught both incidents, plus the equivalent exposure
   anywhere else in the workflow that a ticket can arrive in a status by more
   than one route.
4. A short note on what you did not cover and why, so the team can decide
   whether to extend it later.

Keep the pack something a two-person QA team can actually run in a day.
Email notification content, the escalation report layout, and the agent
console's UI styling are out of scope. Do not write code.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/ticket-workflow.md ===============
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
