# gcov flag reference for embedded coverage

Deep reference for the `embedded-coverage-strategy-reference` SKILL.md.
Consult when reading a `.gcov` report or reaching past the `--coverage` /
`gcov -b -c` basics shown in the SKILL.

## gcov command-line flags

Key flags from the GCC gcov invocation page
([gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html](https://gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html)):

| Flag | Long form | Effect |
|---|---|---|
| `-a` | `--all-blocks` | Write per-basic-block counts |
| `-b` | `--branch-probabilities` | Write branch frequencies + summary to stdout |
| `-c` | `--branch-counts` | Branch frequencies as counts not percentages |
| `-f` | `--function-summaries` | Per-function coverage on top of file-level |
| `-n` | `--no-output` | Suppress the `.gcov` file |
| `-p` | `--preserve-paths` | Preserve full path in generated filenames |
| `-u` | `--unconditional-branches` | Include unconditional branches in `-b` output |
| `--json-format` | - | Emit `.gcov.json.gz` (gzip-compressed JSON, "does not require source code for generation") |

## Reading the `.gcov` text report

The text `.gcov` file annotates each source line with an execution count. Two
sentinels matter:

- `-` marks a non-executable line (declaration, blank, comment).
- `#####` marks an executable line that was never run - the reads worth
  chasing.

`-b -c` together give branch coverage as raw counts, which is what an embedded
branch-coverage gate reads. For per-operand visibility on short-circuit
`&&` / `||`, gcov is not enough - use clang `-fcoverage-mcdc` (see the SKILL's
LLVM section).
