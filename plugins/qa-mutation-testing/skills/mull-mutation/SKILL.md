---
name: mull-mutation
description: "Configures Mull for mutation testing of C / C++ (and via LLVM IR, Swift / Rust to a lesser extent) - LLVM-based, requires building the project with Mull-compatible LLVM toolchain, runs via `mull-runner` against the test binary. Use when a C/C++ project needs mutation-quality verification - the canonical native-language LLVM-IR-level mutation tool."
rating: 22
d6: 3
---

# mull-mutation

## Overview

Per [mull-readme][mr]:

[mr]: https://github.com/mull-project/mull

> "Mull is a practical mutation testing and fault injection tool
> for C and C++."

Per [mull-readme][mr], Mull is "LLVM-based" and "Built on LLVM IR
(Intermediate Representation) and utilizes LLVM JIT compilation."

The LLVM-IR foundation means Mull operates at a layer below the
source language - any LLVM-emitting frontend (Clang, Rust's
rustc, Swift's swiftc) can in principle work, though C / C++ are
the primary targets.

The foundational paper per [mull-readme][mr]: "Mull It Over:
Mutation Testing Based on LLVM" (2018), Denisov & Pankevich.

## When to use

- A C / C++ project needs mutation-quality verification of its
  test suite.
- A library shipping safety-critical code (embedded, kernel,
  cryptography) needs the highest-confidence test suite.
- Language ecosystems without a native mutation tool need an
  LLVM-IR-level fallback.

## Step 1 - Install

```bash
# Linux / macOS — install via package or build from source per the README
# Latest release per [mull-readme]: 0.33.0 (April 2026)
brew install mull-project/mull/mull   # macOS
# OR build from source via cmake (Linux)
```

The CI route is typically `apt install mull` (Debian repos) or
the released `.deb` / `.rpm` packages.

## Step 2 - Build the project for mutation

Mull needs the test binary built with `-O0 -g` (no optimization,
debug symbols) and Mull's LLVM pass:

```bash
# CMake-based project
cmake -DCMAKE_C_FLAGS="-O0 -g -fexperimental-new-pass-manager -Xclang -load -Xclang $MULL_LIB" \
      -DCMAKE_CXX_FLAGS="-O0 -g -fexperimental-new-pass-manager -Xclang -load -Xclang $MULL_LIB" \
      -B build/

cmake --build build/
```

The Mull pass instruments the compiled IR with conditional mutation
points; at runtime, the runner enables / disables each mutation
to test which the test suite catches.

## Step 3 - Run

```bash
mull-runner build/tests/MyTests --reporters json
```

Output:

```
[killed]   src/cart.cpp:42 — Conditional Boundary
[survived] src/cart.cpp:78 — Arithmetic Operator Replacement
[survived] src/cart.cpp:103 — Statement Removal

Mutants killed: 87 (74.4%)
Mutants survived: 30
Mutation score: 74.4%
```

## Step 4 - Mutators

Mull's mutator catalog (representative; per the paper + code):

| Mutator                          | Example                                           |
|----------------------------------|---------------------------------------------------|
| Arithmetic Operator Replacement   | `+` → `-`                                          |
| Conditional Boundary               | `<` → `<=`                                          |
| Conditional Negation               | `==` → `!=`                                         |
| Statement Removal                  | `delete x;` → (removed)                             |
| Return Value Replacement           | `return x;` → `return 0;`                            |
| Constant Mutation                  | `42` → `0`, `1` → `0`                                |

LLVM-IR-level mutation means some source-level patterns produce
equivalent IR (no mutation possible) - Mull skips those silently.

## Step 5 - Filtering

Mull accepts include / exclude path filters:

```bash
mull-runner build/tests/MyTests \
  --include-path "src/checkout/*" \
  --exclude-path "third_party/*" \
  --exclude-path "tests/*"
```

Always exclude tests + third-party - mutating those is
meaningless.

## Step 6 - Reports

```bash
mull-runner build/tests/MyTests --reporters json,html

# Outputs:
# mull-results.json
# mull-results.html
```

The HTML report shows per-file mutation breakdown with line-level
diffs; the JSON is machine-parseable for dashboards.

## Step 7 - CI integration

```yaml
- run: |
    sudo apt-get install -y mull-12   # adjust version per LLVM
    cmake -B build/ -DCMAKE_BUILD_TYPE=Debug
    cmake --build build/
    mull-runner build/tests/MyTests --reporters json
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: mull-results
    path: mull-results.json
```

For PR-incremental runs, scope to changed files:

```bash
CHANGED=$(git diff --name-only origin/main...HEAD | grep -E '\.(c|cpp|h|hpp)$')
mull-runner build/tests/MyTests --include-path "$(echo $CHANGED | tr ' ' ',')"
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Mutating Release builds                                                | Optimizer changes IR shape; mutators behave unpredictably.                | Build with `-O0 -g` (Step 2). |
| Including `tests/` in mutation                                         | Mutates the tests; meaningless.                                          | Exclude tests path (Step 5). |
| Mismatched LLVM versions (Mull built against LLVM 12 but project on LLVM 14) | Linker errors / ABI incompatibility.                                  | Match LLVM versions strictly. |
| Running on every PR                                                    | Slow; team disables.                                                      | Schedule + per-changed-file scope (Step 7). |
| Setting an unrealistic mutation score gate                             | Forces low-value tests.                                                   | Start at current baseline. |

## Limitations

- **LLVM toolchain dependency.** Requires the same LLVM version
  Mull was built against; can be tricky in heterogeneous CI.
- **C / C++ primary; other languages incidental.** Swift / Rust
  via LLVM-IR work in principle but with less polish.
- **Build configuration constraint.** `-O0` builds run slower
  than Release; mutation-runs are inherently slow.
- **No native incremental mode.** Use `--include-path` for git-diff
  scoping (Step 7).
- **Smaller community than Stryker / PIT.** 811 stars per
  [mull-readme][mr] vs Stryker's thousands; tooling integration
  varies.

## References

- [mr][mr] - Mull README: LLVM-based, C/C++ primary, version
  0.33.0, foundational 2018 paper "Mull It Over: Mutation Testing
  Based on LLVM" (Denisov & Pankevich).
- [`stryker-mutation`](../stryker-mutation/SKILL.md),
  [`stryker-net-mutation`](../stryker-net-mutation/SKILL.md),
  [`pitest-mutation`](../pitest-mutation/SKILL.md),
  [`mutmut-mutation`](../mutmut-mutation/SKILL.md) - 
  per-language siblings.
- [`mutation-survivor-explainer`](../../agents/mutation-survivor-explainer.md) - agent for surviving-mutant analysis.
