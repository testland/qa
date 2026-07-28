# Hypothesis reference

Full lookup tables for `hypothesis-testing`: the strategy catalog, the
`@settings` fields, anti-patterns, and limitations. Source:
[Hypothesis quickstart](https://hypothesis.readthedocs.io/en/latest/quickstart.html).

## Strategies catalog

| Strategy                  | Generates                                      | Useful for                                |
|---------------------------|------------------------------------------------|-------------------------------------------|
| `st.integers(min, max)`    | Bounded / unbounded integers                    | Numeric inputs.                            |
| `st.floats(min, max, allow_nan, allow_infinity)` | Floats with optional special-value handling | Numeric edge cases (NaN, ±Inf, denormals). |
| `st.text(alphabet, min_size, max_size)` | Strings           | Text inputs.                               |
| `st.binary(min_size, max_size)` | Bytes                                  | Binary protocol inputs.                    |
| `st.lists(elements, min_size, max_size, unique)` | Lists | Collection inputs.                         |
| `st.dictionaries(keys, values)` | Dicts                              | Map inputs.                                |
| `st.tuples(*element_strategies)` | Tuples                              | Multi-field inputs.                        |
| `st.from_regex(pattern, fullmatch=True)` | Strings matching a regex     | Format-validated inputs (emails, dates).   |
| `st.sampled_from(iterable)` | One of a fixed set                          | Enum-like inputs.                          |
| `st.builds(callable, **kwargs)` | Construct objects from strategies     | Domain objects.                            |
| `st.composite` (decorator) | Custom strategy combining draws                | Dependent fields.                           |

## Settings

| Setting          | Default | Use                                                   |
|------------------|--------:|-------------------------------------------------------|
| `max_examples`   |    100  | More cases for higher confidence; budget against runtime. |
| `deadline`       |  200 ms | Per-test time budget; `None` to disable.              |
| `derandomize`    |  False  | True = same seed each run; useful for CI determinism. |
| `phases`         |  all    | Disable `Phase.shrink` to skip shrinking on slow tests. |
| `verbosity`      |  normal | `quiet` / `normal` / `verbose` / `debug`.             |

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Heavy `assume()` filtering (>50% rejection rate)                      | Slow; Hypothesis warns; sometimes fails the test entirely.               | Restructure the strategy (Step 5). |
| Random seed in CI (default Hypothesis behavior)                        | Tests pass locally, fail on CI; un-reproducible.                         | `derandomize=True` or `--hypothesis-seed=<fixed>` (Step 6). |
| Asserting on specific generated values                                 | Defeats the property; regression tests should use `@example`.            | Property tests assert relationships; specifics go in `@example` (Step 9). |
| Overly broad strategies (`st.text()` for an email field)               | Wastes generation budget on non-meaningful inputs.                       | Use `st.from_regex(EMAIL_PATTERN)` or domain-specific composite. |
| Property that's secretly an example test (one assertion on `n=10`)     | No property; just an example.                                            | Re-formulate as a real property (round-trip / metamorphic / invariant). |
| `max_examples=10000` for a 5-second-per-case test                       | CI never finishes.                                                        | Budget per `Total runtime / max_examples` calculation. |
| Mocking inside the property test                                       | Mocks don't satisfy properties; defeats PBT.                              | Use real implementations OR property-test pure functions. |

## Limitations

- **Shrinking time.** Complex strategies can take 30+ seconds to
  shrink a failing case to its minimum. Disable shrinking
  (`phases=...`) for slow tests where the un-shrunk failure is
  enough.
- **Non-determinism in tested code.** A function whose output
  depends on `time.now()` or random state breaks PBT. Inject
  these as parameters or use Hypothesis's `seeds` for the
  randomness.
- **No statistical guarantee.** 100 examples is convention, not
  proof. For correctness-critical code, supplement with formal
  methods.
- **Strategy composition complexity.** Building strategies for
  deeply nested data takes effort; the payoff is reusability.
- **Test-runner integration.** Hypothesis adapts to pytest /
  unittest; some custom runners need explicit support.
