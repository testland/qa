# acme-ledger — source layout (4.9)

`src/main/java` — 388 classes in 11 packages:

| package                       | classes | note                                |
|-------------------------------|---------|-------------------------------------|
| com.acme.ledger.core          | 41      |                                     |
| com.acme.ledger.core.posting  | 38      |                                     |
| com.acme.ledger.core.balance  | 34      |                                     |
| com.acme.ledger.core.journal  | 33      |                                     |
| com.acme.ledger.importer      | 44      | bank statement ingest               |
| com.acme.ledger.reconcile     | 51      | matching engine                     |
| com.acme.ledger.export        | 37      | SEPA / camt file writers            |
| com.acme.ledger.api           | 29      | REST layer                          |
| com.acme.ledger.audit         | 18      |                                     |
| com.acme.ledger.config        | 12      |                                     |
| com.acme.ledger.notify        | 51      |                                     |

`src/test/java` — 129 classes. This project has never used a separate test
namespace: every test class sits in the `com.acme.ledger.*` package of the code
it exercises, and shared helpers live in `com.acme.ledger.testsupport`. Test
class names are a mix of `*Test` and `*Tests`; the helpers are named for what
they fake.
