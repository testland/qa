# legacy-import — 20 survivors sampled at random from 2,610, pulled 2026-08-14

No classification applied; this is the report output plus the source line the
mutation sits on, and whether the module's tests execute that line at all.

| # | operator                               | location                  | source line                                        | line executed by a test |
|---|----------------------------------------|---------------------------|----------------------------------------------------|--------------------------|
| 1 | VoidMethodCallMutator                  | StatementReader.java:88   | `log.fine("read " + n + " rows");`                  | yes |
| 2 | VoidMethodCallMutator                  | StatementReader.java:141  | `log.finest(row.toString());`                       | yes |
| 3 | NonVoidMethodCallMutator               | RowParser.java:57         | `Objects.requireNonNull(raw, "raw");`               | yes — `raw` is null-checked and thrown on at line 53 |
| 4 | InlineConstantMutator                  | RowParser.java:203        | `int width = Math.max(1, columns);`                 | yes — callers guarantee `columns >= 1` |
| 5 | ConditionalsBoundaryMutator            | ChunkSizer.java:34        | `if (size > Integer.MAX_VALUE) {`                   | yes — `size` is declared `int` |
| 6 | NakedReceiverMutator                   | LegacyCharset.java:71     | `return token.trim();`                              | yes — the tokenizer trims every token before this |
| 7 | RemoveConditionalMutator               | ChunkSizer.java:34        | `if (size > Integer.MAX_VALUE) {`                   | yes |
| 8 | ExperimentalArgumentPropagationMutator | StatementReader.java:88   | `log.fine("read " + n + " rows");`                  | yes |
| 9 | RemoveIncrementsMutator                | RowParser.java:118        | `skipped++;  // only ever read by the log line below` | yes |
| 10| ConstructorCallMutator                 | RowParser.java:64         | `throw new ParseException(msg);`                    | yes — message text asserted nowhere |
| 11| ConditionalsBoundaryMutator            | RowParser.java:96         | `if (row.length() > 132) {`                         | yes — no test uses a 132- or 133-character row |
| 12| NullReturnsMutator                     | StatementReader.java:64   | `return statement;`                                 | yes — no test asserts the result is non-null |
| 13| MathMutator                            | AmountCodec.java:22       | `return debit ? -value : value;`                    | yes — no test asserts a debit is negative |
| 14| NegateConditionalsMutator              | BalanceCheck.java:40      | `if (declared.equals(computed)) {`                  | yes — only the equal case is tested |
| 15| EmptyReturnsMutator                    | RowParser.java:172        | `return columns;`                                   | yes — result length never asserted |
| 16| NegateConditionalsMutator              | ArchiveReader.java:210    | `if (entry.isDirectory()) {`                        | no |
| 17| MathMutator                            | ArchiveReader.java:233    | `offset = offset + header.size();`                  | no |
| 18| InlineConstantMutator                  | ChunkSizer.java:52        | `private static final int PAD = 0;`                 | yes — PAD is added to a value that is never asserted |
| 19| PrimitiveReturnsMutator                | AmountCodec.java:41       | `return scale;`                                     | yes — no test reads the scale |
| 20| NakedReceiverMutator                   | LegacyCharset.java:104    | `return name.toUpperCase(Locale.ROOT);`             | yes — callers pass an already-upper-cased constant |
