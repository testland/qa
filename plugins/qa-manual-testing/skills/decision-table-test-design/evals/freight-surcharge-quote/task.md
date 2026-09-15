# Maike struck six shipment shapes off the surcharge matrix as impossible

## Problem Description

Quoting and invoicing disagree on surcharges and finance wants a comparison run
before they reopen a year of invoices. Maike in pricing built the matrix for
that run. She started from the sixteen shapes the four surcharge facts can
describe, then struck six of them out as shapes a customer cannot order, and
handed us ten to price through both systems.

Her strikeouts come from the quoting form: the tail-lift option is only offered
once an address is marked residential, and the form will not take a lift on an
island destination at all. She checked both in the form and wrote down what she
saw, which is more than the last person to touch this did.

I want the comparison run to be the one that finds the disagreements, not the
one that misses them because we agreed too fast about what customers can order.
Tell me which strikeouts survive and which do not, and give me the shapes to
price.

The schedule, Maike's matrix note, how orders reach us, a sample of last
quarter's orders and the ferry operator's vehicle note are attached.

## Output Specification

1. Write `docs/matrix-review.md`: for each of Maike's six strikeouts, whether it
   stands and on what evidence, and the corrected set of shapes with the list
   surcharge total for each.
2. For any strikeout that stands, say how the comparison run proves the
   constraint still holds, so nobody re-derives this from a form six months from
   now.
3. Give finance the shipments to quote and invoice.

Out of scope: VAT, fuel indexation, and customer-specific rate agreements.
Assume list pricing throughout.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/surcharge-schedule.md ===============
# Pallet freight surcharge schedule (list pricing, 2026 H2)

A dock-to-dock mainland delivery under 500 kg carries no surcharge.

Residential delivery carries an access surcharge of EUR 25. It is not applied to
island destinations, which are quoted per shipment.

A tail lift adds EUR 40. At a residential address the lift is charged at EUR 65
rather than EUR 40, because the driver works without a dock.

Island destinations carry a ferry surcharge of EUR 95.

Shipments over 500 kg carry a heavy-goods surcharge of EUR 30. Island shipments
carry no heavy-goods surcharge.

Surcharges that apply are added together and shown as one line on the invoice.

=============== FILE: docs/maike-matrix-note.md ===============
# Surcharge comparison matrix - what I removed and why

Four facts decide the surcharge: residential address, over 500 kg, tail lift
required, island destination. Sixteen shapes in principle.

Struck out as unorderable (six shapes):

| # | residential | over 500 kg | tail lift | island | reason |
|---|---|---|---|---|---|
| 1 | no | no | yes | no | lift option is not offered on a commercial address |
| 2 | no | yes | yes | no | lift option is not offered on a commercial address |
| 3 | no | no | yes | yes | lift option is not offered on a commercial address |
| 4 | no | yes | yes | yes | lift option is not offered on a commercial address |
| 5 | yes | no | yes | yes | the form refuses a lift on an island destination |
| 6 | yes | yes | yes | yes | the form refuses a lift on an island destination |

I clicked through both of these on the quoting form this morning. The tail-lift
checkbox does not render until the address is marked residential, and choosing an
island postcode greys it out again. Ten shapes left to price.

- Maike

=============== FILE: docs/order-channels.md ===============
# How freight orders reach us

Two channels create orders, and both write the same order record.

**Quoting form (web).** Used by our own sales desk and by walk-up customers.
Roughly 62% of orders last quarter. The form validates as it goes and will not
submit a combination it considers invalid.

**EDI.** Our larger accounts send orders straight from their own systems against
the published order schema. Roughly 38% of orders last quarter. EDI orders do not
pass through the form; the schema validates field types and required fields only,
and the accepted order goes to pricing exactly as sent.

Nothing in the pricing path distinguishes a form order from an EDI order.

=============== FILE: data/orders-sample.csv ===============
order_ref,channel,destination,residential,gross_kg,tail_lift,island
WEB-44210,web,Hamburg,no,180,no,no
EDI-90114,edi,Bremen,no,320,yes,no
WEB-44233,web,Kiel,yes,140,yes,no
EDI-90117,edi,Dortmund,no,640,yes,no
EDI-90121,edi,Essen,no,410,yes,no
WEB-44251,web,Sylt,no,210,no,yes
EDI-90140,edi,Norderney,yes,180,no,yes
WEB-44288,web,Rostock,yes,720,yes,no
EDI-90162,edi,Lubeck,no,880,no,no
EDI-90177,edi,Borkum,no,650,no,yes
WEB-44301,web,Flensburg,yes,95,no,no
EDI-90184,edi,Emden,no,540,yes,no

=============== FILE: docs/ferry-service-note.md ===============
# Island services - vehicle restrictions

Extract from the ro-ro operator's carriage conditions, 2026 season.

> Vehicles presented for the island freight sailings must be within the deck
> height envelope. Rear-mounted lift platforms take a vehicle outside the
> envelope and are not carried on any island service.

Our island deliveries are trunked to the port and run on the operator's sailings.
We hold no lift-equipped vehicle on any island route and have never quoted one.
This is a physical constraint on the service, not a form rule.
