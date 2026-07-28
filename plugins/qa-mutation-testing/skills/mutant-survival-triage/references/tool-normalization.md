# Tool normalization reference

Per-tool field mapping, status vocabularies, and operator-name-to-family tables
for `mutant-survival-triage`. Linked inline from that skill's SKILL.md. Flatten
each survivor into the `SurvivedMutant` record (see SKILL.md Step 1), then use
these tables to fill the fields (Step 1) and match the mutator family (Step 3).

## Where each field comes from

| Field | StrykerJS | PIT | mutmut | Mull |
|---|---|---|---|---|
| `mutator` | `mutatorName` in the JSON report | mutator name from the mutator set, for example `CONDITIONALS_BOUNDARY` | operator implied by the diff shown in `mutmut browse` | operator id in brackets, for example `[cxx_ge_to_gt]` |
| `file` / `line` | `location` (start and end line and column) | source file and line number in the HTML or XML report | the mutated function in the `mutants/` directory | `path:line:column` prefix on the survivor line |
| `mutated` | `replacement` | rendered on the report line | diff shown in `mutmut browse` | text after `Survived:` on the survivor line |
| `coveredBy` | `coveredBy` (and `killedBy` when killed) | the covering tests PIT ran for that line | the tests mutmut selected for that function | not reported per mutant |

StrykerJS field names above are the properties the mutation testing report schema
defines for a mutant result: `id`, `mutatorName`, `replacement`, `description`,
`location`, `status`, `statusReason`, `testsCompleted`, `static`, `coveredBy`,
`killedBy`, `duration` ([report schema JSON](https://raw.githubusercontent.com/stryker-mutator/mutation-testing-elements/master/packages/report-schema/src/mutation-testing-report-schema.json)).
Mull's console format is exactly
`/tmp/sc-tTV8a84lL/main.cpp:2:11: warning: Survived: Replaced >= with > [cxx_ge_to_gt]`
under a `[info] Survived mutants (1/4):` heading
([Mull hello-world tutorial](https://mull.readthedocs.io/en/latest/tutorials/HelloWorld.html)).
mutmut's documented workflow is `mutmut run` then `mutmut browse`, with mutants
kept "in the `mutants/` directory" and written back with `mutmut apply <mutant>`
([mutmut docs](https://mutmut.readthedocs.io/en/latest/)); it publishes no
machine-readable report format, so the mutmut record is filled in from the
browse UI rather than parsed.

## Do not merge the status vocabularies

"Survived" is not the only non-killed outcome, and the neighbouring statuses
change the classification in Step 2. Keep the tool's own status word:

| Tool | Statuses that are not "killed" |
|---|---|
| StrykerJS | `Survived`, `NoCoverage`, `Timeout`, `RuntimeError`, `CompileError`, `Ignored`, `Pending` ([mutant states](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/)) |
| PIT | survived, no coverage, timed out, non viable, memory error, run error ([PIT basic concepts](https://pitest.org/quickstart/basic_concepts/)) |
| mutmut | survived, plus timeout and suspicious outcomes surfaced in `mutmut browse` ([mutmut docs](https://mutmut.readthedocs.io/en/latest/)) |
| Mull | survived, listed under `[info] Survived mutants (n/total):` ([Mull tutorial](https://mull.readthedocs.io/en/latest/tutorials/HelloWorld.html)) |

Two of these decide a class on their own. StrykerJS defines `NoCoverage` as "the
mutant isn't covered by one of your tests and survived as a result"
([mutant states](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/)),
and PIT states "No coverage is the same as Survived except there were no tests
that exercised the line of code where the mutation was created"
([PIT basic concepts](https://pitest.org/quickstart/basic_concepts/)). A
no-coverage mutant is never a weak-assertion finding: no assertion ran.

## Per-mutator operator names by tool

Match on the family, not the string:

| Family | StrykerJS | PIT | mutmut | Mull |
|---|---|---|---|---|
| Conditional boundary | `GreaterThanBoundary` (`a > b` to `a >= b`), `LessThanBoundary` (`a < b` to `a <= b`) under the Equality Operator mutator | `CONDITIONALS_BOUNDARY`, a default mutator that "replaces the relational operators `<, <=, >, >=` with their boundary counterpart" | documented example: "`<` is changed to `<=`" | `cxx_lt_to_le`, `cxx_ge_to_gt`, group `cxx_boundary` |
| Arithmetic operator | Arithmetic Operator: `AdditionNegation` (`a + b` to `a - b`), `MultiplicationNegation` (`a * b` to `a / b`) | `MATH`, a default mutator that replaces binary arithmetic operations | not documented as a named operator | `cxx_add_to_sub`, `cxx_sub_to_add`, `cxx_mul_to_div`, group `cxx_arithmetic` |
| Statement or call removal | Block Statement: `BlockRemoval` "removes the content of every block statement" | `VOID_METHOD_CALLS`, a default mutator that removes calls to void methods | not documented as a named operator | `cxx_remove_void_call`, group `cxx_calls` |
| Constant or literal | String Literal (`"foo"` to `""`), Boolean Literal (`true` to `false`) | `EMPTY_RETURNS`, `FALSE_RETURNS`, `TRUE_RETURNS`, `NULL_RETURNS`, `PRIMITIVE_RETURNS` (defaults); `INLINE_CONSTS` (optional) | documented example: "Integer literals are changed by adding 1. So 0 becomes 1, 5 becomes 6" | `cxx_assign_const`, `cxx_init_const`, `cxx_replace_scalar_call` |

Sources for that table: StrykerJS operator names and replacements from
[supported mutators](https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/);
PIT operator names, quoted definitions, and default-set membership from
[PIT mutation operators](https://pitest.org/quickstart/mutators/); mutmut's
documented example mutations from [mutmut docs](https://mutmut.readthedocs.io/en/latest/),
which point at `node_mutation.py` for the complete list rather than enumerating it;
Mull operator identifiers and groups from
[Mull supported mutations](https://mull.readthedocs.io/en/latest/SupportedMutations.html).
mutmut is left blank in two rows on purpose: its public docs do not name those
operators, so do not assert them.
