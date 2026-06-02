---
component: fuzz-target-author
type: agent
archetype: A4
---

# fuzz-target-author - evals

Companion eval cases for [`fuzz-target-author`](../../fuzz-target-author.md).
Three cases cover happy path / branch / adversarial: a C/C++ libFuzzer
harness scaffold from a `parse_json` signature, a different-language
branch (Rust `cargo-fuzz`), and a missing-signature refusal. Re-run by
feeding the **Input** block as the first user message and checking the
agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - C/C++ libFuzzer harness from a parse_json signature

**Input:**

```
Scaffold a fuzz target for this function. Project root contains
CMakeLists.txt + src/json_parser.cc + include/json_parser.h with .c/.cc
sources throughout — this is a C++ project.

Signature (from include/json_parser.h):

  namespace acme {
    int parse_json(const uint8_t *data, size_t size);
  }

The function is pure: it parses the buffer into an in-memory AST and
returns 0 on success / -1 on parse error. No global state, no I/O.

Target name: leave as default (derive from function name).
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Step 1 detects C/C++ from `CMakeLists.txt` + `.cc` sources.
Step 2 routes via `fuzz-toolkit-dispatcher` to libFuzzer (callable
library API, not file-driven → libFuzzer cheaper than AFL++). Step 3
emits a `fuzz/fuzz_parse_json.cc` harness containing the canonical
`LLVMFuzzerTestOneInput(const uint8_t *Data, size_t Size)` entry point
that calls `acme::parse_json(Data, Size)` and returns 0. Step 4 creates
`fuzz/seeds/` and `fuzz.dict` (JSON keyword tokens). Step 5 emits the
`clang -g -O1 -fsanitize=fuzzer,address,undefined` build command. Step 6
emits a `.github/workflows/fuzz.yml` snippet with `-max_total_time=300`
and `actions/upload-artifact@v4` for crash files. Step 7 lists the
generated files and the exact first-run command. No `git add` happens
(refuse rule).

**Pass condition:** Output contains the literal string
`LLVMFuzzerTestOneInput` AND `fuzz/seeds/` AND
`-fsanitize=fuzzer,address,undefined`. Output does NOT contain `git add`
of generated files. Output mentions the harness path
`fuzz/fuzz_parse_json` (the agent derives the target name from the
function name when no override is given).

## Eval 2 - branch - Rust cargo-fuzz target from a Cargo project

**Input:**

```
Scaffold a fuzz target for this Rust function. Project root contains
Cargo.toml + src/lib.rs.

Signature (from src/lib.rs):

  pub fn decode_varint(data: &[u8]) -> Result<u64, DecodeError> { ... }

The function is pure: decodes a length-prefixed varint from a byte
slice. No globals, no I/O.

Target name: decode_varint (matches function).
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Step 1 detects Rust from `Cargo.toml`. Step 2 routes via
the dispatcher to cargo-fuzz (the canonical Rust path). Step 3 emits
`fuzz/fuzz_targets/decode_varint.rs` containing
`#![no_main]` + `use libfuzzer_sys::fuzz_target;` + a
`fuzz_target!(|data: &[u8]| { ... })` body that calls
`decode_varint(data)`. Step 4 creates `fuzz/seeds/` (varint inputs left
empty for the user). Step 5 emits the `cargo +nightly fuzz init &&
cargo +nightly fuzz add decode_varint` + `cargo +nightly fuzz run
decode_varint -- -max_total_time=300` commands. Sanitiser composition
is preserved (ASan default for Rust). No C/C++ libFuzzer artefacts
appear in the output (that would be a wrong-branch failure).

**Pass condition:** Output contains the literal string `cargo` AND
`fuzz_target!` AND `#![no_main]`. Output does NOT contain
`LLVMFuzzerTestOneInput` (the C/C++ entry point - would indicate the
agent took the wrong language branch). Output does NOT contain
`atheris` / `Jazzer` / `FuzzXxx(f *testing.F)` (other-language branches).

## Eval 3 - adversarial - missing function signature (refuse to scaffold)

**Input:**

```
Please scaffold a fuzz target. We want to start fuzzing our codebase
this sprint. Project layout: Go + Rust + Python — multiple Cargo.toml
files, go.mod, pyproject.toml all present.

(No function signature provided. No target file path. No language
preference.)
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to scaffold. The agent's `When invoked` block
declares the required input as "a target function signature (or file
containing one)" - none is supplied. The detection heuristic
deliberately fails-closed on ambiguous multi-language layouts (Step 1:
"Ask the user if ambiguous"). The agent does NOT invent a function
signature, does NOT pick a language at random, and does NOT generate a
harness file. It requests the missing signature + language choice and
points to the dispatcher for the routing menu. The `Limitations`
section's "Detection heuristic" caveat is the controlling note for
multi-language repos.

**Pass condition:** Output asks for the target function signature
(contains a question or request mentioning `signature` or `function`).
Output does NOT contain `LLVMFuzzerTestOneInput`, `fuzz_target!`,
`func Fuzz`, `atheris.Setup`, or `@FuzzTest` (no harness body of any
language). Output does NOT write any file under `fuzz/` (the
scaffolder's primary side-effect is suppressed).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Grep`, `Glob`, `Write`, `Edit`,
  narrow `Bash(git *|clang *|go *|cargo *)`) writes harness files but
  the refuse rules prevent file-writes on missing-signature input - 
  eval 3 is observable as the absence of writes plus the request for
  the missing field.
- Eval cases were authored 2026-05-26 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
