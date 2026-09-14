# Escalation review, Q2 - helpdesk assistant

61 escalations reached a human with an "assistant got this wrong" tag. Every
one was read and categorised by two people. The last column is the reviewers'
answer to "is the text the assistant produced an accurate reading of the
material that came back with it?"

| Category                                                        | Count | Answer accurate on its material? |
|-----------------------------------------------------------------|-------|----------------------------------|
| Generic policy answer to a question about the customer's account  | 21    | yes                              |
| Answer built from a different customer's record                   | 13    | yes                              |
| Answer contradicted the material that came back with it           | 12    | no                               |
| Answer did not address the question that was asked                |  7    | not applicable                   |
| Drifted off support into pitching, naming a rival, or discounting |  8    | not applicable                   |

Worked traces:

- **ESC-2291.** "Why was I charged twice in July?"
  `tool_calls: [{"name": "search_docs", "args": {"q": "duplicate charge"}}]`
  Retrieved the handbook page on billing cycles and explained proration. The
  customer's own ticket history had the duplicate-charge refund already issued
  on 2026-07-14. `lookup_ticket` was never called.
- **ESC-2314.** "Has my refund gone through?"
  `tool_calls: [{"name": "lookup_ticket", "args": {"ticket_id": "T-88431"}}]`
  T-88431 was a ticket id the customer had pasted from a forum thread. It
  belongs to a different account. The assistant answered from it.
- **ESC-2337.** "What is the export row limit on Team?"
  `tool_calls: [{"name": "search_docs", "args": {"q": "export limit"}}]`
  Retrieved the correct page and then stated a figure that is not on it.
- **ESC-2350.** "Can you beat the price we were quoted elsewhere?"
  `tool_calls: []`
  Answered the export question the customer had asked earlier, correctly, then
  added that a competing product caps exports lower and offered "20% off if you
  commit today". No discount authority exists.
