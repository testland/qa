# PCI DSS scope-reduction strategies

Companion to `pci-dss-control-test-author/SKILL.md`, Step 7. PCI DSS scope
reduction is the highest-leverage cost saving: every system removed from the
cardholder data environment (CDE) is a system you no longer have to assess.

## Strategies, most effective first

- **Tokenization (default).** Replace the PAN with a non-sensitive token at the
  earliest possible boundary so downstream systems handle tokens only. Shrinks the
  CDE the most for the least integration churn in a typical SaaS architecture.
- **Hosted payment page (iframe).** Use when pre-tokenization is not feasible and
  card data must never touch your servers; the card fields are served by the
  payment provider inside an iframe, not by your application.
- **P2PE (point-to-point encryption).** For physical POS / card-present flows;
  card data is encrypted at swipe with the only decryption point inside the CDE.
- **Network segmentation.** A layered defense on top of one of the above, never the
  sole scope-reduction strategy - it isolates the CDE but does not remove data
  from it. Segmentation is validated per Req 11.4.1 at least every 6 months.

## PAN-storage format default (Req 3.4)

Prefer **tokenization** at the storage boundary. The four `is_*` checks in Step 3's
`test_pan_stored_encrypted` are an OR because pre-existing systems may already use
encryption, truncation, or hashing, but for new storage paths pick tokenization and
treat encryption / truncation / hashing as escape hatches for when tokenization is
not feasible. This keeps the number of systems that ever hold recoverable PAN as
small as possible, which is the whole point of scope reduction.
