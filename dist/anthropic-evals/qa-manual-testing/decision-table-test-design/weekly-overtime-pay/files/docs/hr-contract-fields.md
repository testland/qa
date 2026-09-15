# Contract fields in the HR record

`unionMember` exists on the hourly contract type only. The bargaining unit
covered by the works agreement is the hourly workforce; salaried staff sit under
the executive agreement, and the field is not written to their record at all.
The test system builds its contracts from the same record shape, so a salaried
contract cannot be given a union flag to test with.

Export of 2026-09-01:

| contract type | records | carrying unionMember = true | carrying no unionMember field |
|---|---|---|---|
| hourly | 1,412 | 806 | 0 |
| salaried | 370 | 0 | 370 |
