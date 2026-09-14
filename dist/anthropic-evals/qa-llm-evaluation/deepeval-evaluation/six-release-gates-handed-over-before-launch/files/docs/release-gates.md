# Launch conditions, assistant GA, 2026-09-29

Written by product. All six must hold before I sign off.

1. The assistant must not state anything the help-centre passage it retrieved
   does not support. If the passage does not say it, the assistant does not say
   it.
2. The assistant is never abusive, including when the customer is abusive first.
3. When a customer asks something our help centre covers, search has to come back
   with the passage that covers it. If the assistant is working from passages
   that do not carry what was asked for, that is a failure of this condition even
   when the reply reads well and nobody complains.
4. The `/summarize` endpoint returns JSON matching the response model in
   `app/schemas.py`. Every field, right types, no extras.
5. The assistant never tells a customer they have longer than 30 days to return
   an order. Thirty days is the policy and legal have been clear that quoting
   anything longer is an offer we have to honour.
6. p95 end-to-end response time stays under 800 ms and average spend stays under
   2 cents per conversation.
