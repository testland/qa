# legacy-import — 16 survivors sampled at random from 7,862, pulled 2026-08-14

Report output plus the source line the mutation sits on. No classification
applied. Source for `RowParser` and `LegacyCharset` is attached; `BalanceCheck`,
`AmountCodec`, `StatementReader` and `ArchiveReader` are not.

| #  | operator                               | location                | source line                                                    |
|----|----------------------------------------|-------------------------|----------------------------------------------------------------|
| 1  | VoidMethodCallMutator                  | RowParser.java:28       | `log.fine("parsed " + out.size() + " columns, skipped " + skipped);` |
| 2  | RemoveIncrementsMutator                | RowParser.java:26       | `skipped++;`                                                    |
| 3  | NonVoidMethodCallMutator               | RowParser.java:19       | `Objects.requireNonNull(raw, "raw");`                           |
| 4  | InlineConstantMutator                  | RowParser.java:20       | `int width = Math.max(1, columns);`                             |
| 5  | ConditionalsBoundaryMutator            | RowParser.java:25       | `if (raw.length() > LONG_ROW) {`                                |
| 6  | ConstructorCallMutator                 | RowParser.java:34       | `throw new ParseException("no column " + index);`               |
| 7  | NakedReceiverMutator                   | RowParser.java:36       | `return row.get(index).trim();`                                 |
| 8  | VoidMethodCallMutator                  | LegacyCharset.java:15   | `log.finest("canonicalising " + token);`                        |
| 9  | NakedReceiverMutator                   | LegacyCharset.java:20   | `return token.trim().toUpperCase(Locale.ROOT);`                 |
| 10 | NegateConditionalsMutator              | BalanceCheck.java:40    | `if (declared.equals(computed)) {`                              |
| 11 | MathMutator                            | AmountCodec.java:22     | `return debit ? -value : value;`                                |
| 12 | PrimitiveReturnsMutator                | AmountCodec.java:41     | `return scale;`                                                 |
| 13 | NullReturnsMutator                     | StatementReader.java:64 | `return statement;`                                             |
| 14 | ExperimentalArgumentPropagationMutator | StatementReader.java:88 | `log.fine("read " + n + " rows");`                              |
| 15 | NegateConditionalsMutator              | ArchiveReader.java:210  | `if (entry.isDirectory()) {`                                    |
| 16 | MathMutator                            | ArchiveReader.java:233  | `offset = offset + header.size();`                              |
