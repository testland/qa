# Launch conditions, assistant GA, 2026-09-29

Written by product. All six must hold before I sign off.

1. The assistant must not state anything the help-centre passage it retrieved
   does not support. If the passage does not say it, the assistant does not say
   it.
2. The assistant is never abusive, including when the customer is abusive
   first.
3. The `/summarize` endpoint returns JSON matching the response model in
   `app/schemas.py`. Every field, right types, no extras.
4. p95 end-to-end response time stays under 800 ms.
5. Average spend stays under 2 cents per conversation.
6. The assistant never tells a customer they have longer than 30 days to return
   an order. Thirty days is the policy and legal have been clear that quoting
   anything longer is an offer we have to honour.
