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
