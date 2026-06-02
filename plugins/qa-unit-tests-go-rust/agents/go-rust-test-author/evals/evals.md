---
component: go-rust-test-author
type: agent
archetype: A2
---

# go-rust-test-author - evals

Companion eval cases for [`go-rust-test-author`](../../go-rust-test-author.md).
Three cases covering happy path (Go) + branch (Rust) + adversarial
(polyglot workspace). Re-run by feeding the **Input** block as the first
user message to the agent and comparing the emitted test file against
the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Run dates recorded below
are the eval-authoring date - each eval is designed to be re-run against
each tier.

## Eval 1 - happy path - Go project with stdlib `testing` → `func TestXxx(t *testing.T)` + table cases via `t.Run`

**Input:**

```
Author a Go or Rust unit test for this target callable.

Target package + signature:
  package userservice  →  func GetUser(repo UserRepo, id uuid.UUID) (*User, error)
  (declared in userservice/user.go)
Behavior spec: "Given an empty in-memory repo, when GetUser is called
                with any UUID (including uuid.Nil and a random one),
                then it returns errors.Is(err, ErrNotFound) == true."
Project root: . (contains go.mod at the root + an empty userservice/ package)

go.mod (excerpt):
module example.com/userservice

go 1.22

require github.com/google/uuid v1.6.0

go.sum: only contains github.com/google/uuid; NO github.com/onsi/ginkgo entries.
No existing *_test.go files.
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Detects Go (from `go.mod`). Detects stdlib `testing` as the
framework (no Ginkgo in `go.sum`; no existing Ginkgo bootstrap). Emits
ONE test file at `userservice/user_test.go` with `package userservice`,
`import "testing"`, a top-level `func TestGetUser_…(t *testing.T)`
function, table cases driven by `t.Run("...", func(t *testing.T) { ... })`
subtests, and `t.Errorf` (not `t.Fatalf`) on the mismatch path so all
subcases run. Uses `errors.Is(err, ErrNotFound)` per the spec. Does NOT
introduce Ginkgo/Gomega imports. Does NOT modify `user.go`.

**Pass condition:** Output filename ends in `user_test.go` under
`userservice/`. Output contains `func TestGetUser` AND `*testing.T` AND
`t.Run(` AND `t.Errorf(` AND `errors.Is(`. Output does NOT contain
`Describe(` OR `RegisterFailHandler` OR `Expect(` (no Ginkgo/Gomega
imports).

## Eval 2 - branch - Rust project with `rstest` in dev-deps → inline `#[cfg(test)] mod tests` + `#[rstest]` + `#[case]`

**Input:**

```
Author a Go or Rust unit test for this target callable.

Target module + signature:
  pub fn user_id_is_valid(id: &str) -> bool
  (declared in src/user_id.rs)
Behavior spec: "user_id_is_valid returns false for empty / whitespace-only
                strings. Cover at least the empty string and a string of
                only spaces."
Project root: . (contains Cargo.toml + src/user_id.rs + src/lib.rs)

Cargo.toml (excerpt):
[package]
name = "user-id"
version = "0.1.0"
edition = "2021"

[dev-dependencies]
rstest = "0.26"
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Detects Rust (from `Cargo.toml`; no `go.mod`). Detects
`rstest` as the framework (in `[dev-dependencies]`). Emits an inline
`#[cfg(test)] mod tests { use super::*; use rstest::rstest; ... }`
block appended to `src/user_id.rs` (the conventional Rust unit-test
location - NOT a new file under `tests/`). The test uses `#[rstest]`
with at least two `#[case(...)]` attributes covering an empty string
and a whitespace-only string. The test body uses `assert!(!...)` (or
`assert_eq!(..., false)`) - NOT a bare `assert!(true)`. Does NOT
introduce a `tests/` integration-test file. Does NOT install/add
dependencies.

**Pass condition:** Output is an edit/append to `src/user_id.rs`. Output
contains `#[cfg(test)]` AND `mod tests` AND `use super::*` AND
`#[rstest]` AND at least two `#[case(` lines AND one of `assert!(!` /
`assert_eq!(` invoking `user_id_is_valid`. Output does NOT create a new
file at `tests/user_id.rs` AND does NOT contain `[dev-dependencies]`
edits to `Cargo.toml`.

## Eval 3 - adversarial - project root has BOTH `go.mod` AND `Cargo.toml` → refuse and ask which language to target

**Input:**

```
Author a Go or Rust unit test for this target callable.

Target callable signature:
  validate_id(id) -> bool  (no package/crate qualifier given)
Behavior spec: "validate_id returns false for empty strings."
Project root: . (contains BOTH go.mod AND Cargo.toml at the root —
                 polyglot workspace: a Rust crate vendored alongside Go
                 services)
```

**Target models:** sonnet (2026-05-24)

**Expected:** Refuses to author. Detects that both `go.mod` AND
`Cargo.toml` are present at the project root, which makes the
language-detection step ambiguous. Asks the user to specify which
language (Go or Rust) the new test should target. Does NOT silently pick
one and emit a test in that language. Does NOT pick "both" and emit two
test files.

**Pass condition:** Output does NOT contain a generated test method body
(no `func Test…(t *testing.T)` body AND no `#[test]` or `#[rstest]`
function with a body that calls `validate_id`). Output mentions BOTH
`go.mod` AND `Cargo.toml` (or `Go` AND `Rust`) and asks the user to
disambiguate (contains one of `which language` / `Go or Rust` / `specify
the language` / `polyglot`). Output does NOT create or modify any
`.go` / `.rs` file.

## Reproducibility notes

- Inputs are concrete file contents inlined above; no external fixtures.
- Pass conditions are string-match checks on the emitted test file
  content (or, for Eval 3, on the agent's refuse-to-proceed message).
- The agent's tool surface (`Write`, `Edit`, narrow `Bash(go test *)` /
  `Bash(go vet *)` / `Bash(ginkgo *)` / `Bash(cargo test *)` /
  `Bash(cargo build *)`) writes only into the project's test tree per
  the detected language/framework convention; eval re-runs should not
  modify production code outside the target file (Eval 2 explicitly
  appends to `src/user_id.rs` because Rust's inline-unit-test
  convention puts `#[cfg(test)] mod tests` at the bottom of the source
  file - this is allowed by the agent's "never modifies existing
  tests" rule because the appended block IS the new test).
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7
  sub-checks (≥3 cases, ≥1 adversarial, concrete pass conditions).
