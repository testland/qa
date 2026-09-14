Exported monthly by returns ops from the portal event log.

- `portal_decision` is what the software decided at submission time.
- `final_disposition` is where the ticket ended up after any human review.
- `override_by` is populated only where a person changed the software's answer.
  An empty cell means nobody touched the ticket after submission.
- `return_shipping_refunded` is `n/a` where the return itself was not
  accepted, since there is no shipment to refund.

The August file is the current one. Nothing in it has been edited by hand, and
every request closed in August is in it.
