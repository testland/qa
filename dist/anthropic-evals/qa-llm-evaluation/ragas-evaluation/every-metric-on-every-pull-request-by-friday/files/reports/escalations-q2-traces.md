# Five escalations written out, with the reviewers' note on each

- **ESC-2291.** "Why was I charged twice in July?"
  `tool_calls: [{"name": "search_docs", "args": {"q": "duplicate charge"}}]`
  Retrieved the handbook page on billing cycles and explained proration. The
  customer's own ticket history had the duplicate-charge refund already issued
  on 2026-07-14. `lookup_ticket` was never called.
  *Reviewers: the proration explanation is a correct reading of the page it
  retrieved. It is answering a question nobody asked.*

- **ESC-2314.** "Has my refund gone through?"
  `tool_calls: [{"name": "lookup_ticket", "args": {"ticket_id": "T-88431"}}]`
  T-88431 is a ticket id the customer had pasted from a forum thread. It
  belongs to a different account.
  *Reviewers: it reported that ticket's status accurately. The ticket is not
  the customer's.*

- **ESC-2337.** "What is the export row limit on Team?"
  `tool_calls: [{"name": "search_docs", "args": {"q": "export limit"}}]`
  Retrieved the correct page and then stated a figure that is not on it.
  *Reviewers: flatly contradicts the page it cited.*

- **ESC-2350.** "Can you beat the price we were quoted elsewhere?"
  `tool_calls: []`
  Answered the export question the customer had asked earlier, correctly, then
  added that a competing product caps exports lower and offered "20% off if you
  commit today". No discount authority exists.
  *Reviewers: not a support answer at all.*

- **ESC-2402.** "Which region is my workspace in?"
  `tool_calls: [{"name": "lookup_ticket", "args": {"ticket_id": "T-90117"}}]`
  Right account, right ticket. Answered with the plan tier instead of the
  region, which is on the same record.
  *Reviewers: correct data, wrong question answered.*
