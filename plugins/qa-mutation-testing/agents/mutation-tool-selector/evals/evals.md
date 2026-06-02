---
component: mutation-tool-selector
type: agent
archetype: A2
---

# mutation-tool-selector - evals

Companion eval cases for [`mutation-tool-selector`](../../mutation-tool-selector.md).

## Eval 1: happy path - TypeScript project

**Input:**
- Project root contains `package.json` with `"typescript": "^5"` in devDependencies + `*.ts` source files.
- No `*.csproj` / `pom.xml` / `pyproject.toml`.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Recommends **Stryker** as the primary tool. Rationale: canonical JS/TS mutation testing framework; integrates with Jest / Vitest / Mocha / Jasmine. Read next: `stryker-mutation`.

**Pass condition:** Output contains the literal substrings `Stryker` AND `stryker-mutation` AND (`typescript` OR `TypeScript`) and does NOT recommend Stryker.NET / PIT / Mutmut / Mull (wrong language).

## Eval 2: branch - Python project

**Input:**
- Project root contains `pyproject.toml` with `[tool.pytest.ini_options]` block + `tests/` directory with `*.py` files + `src/` with Python modules.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Recommends **Mutmut** as the primary tool. Rationale: Python mutation testing with the broadest pytest integration. Read next: `mutmut-mutation`.

**Pass condition:** Output contains the literal substrings `Mutmut` AND `mutmut-mutation` AND (`python` OR `Python`) and does NOT recommend other tools.

## Eval 3: adversarial - language not covered (Rust)

**Input:**
- Project root contains `Cargo.toml` with `[package]` block + `src/main.rs`.
- No other language markers.

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to recommend one of the 5 supported tools. Flags that Rust is not covered by this plugin (Stryker / Stryker.NET / PIT / Mutmut / Mull cover JS / .NET / JVM / Python / C-C++ respectively). Suggests the user look for Rust-native mutation testing alternatives outside this plugin (mutagen, cargo-mutants - but do NOT recommend a specific one without verification).

**Pass condition:** Output contains the literal substring `Rust` AND (`not covered` OR `not supported` OR `outside this plugin`) and does NOT contain "Recommended tool: Stryker" OR "Recommended tool: Stryker.NET" OR "Recommended tool: PIT" OR "Recommended tool: Mutmut" OR "Recommended tool: Mull".

## Notes

- Eval file lives outside the lint glob - no rating frontmatter needed.
- Pass conditions are literal-string checks; a reviewer can grep transcripts.
- Target-model dates are eval-authoring dates (2026-05-25).
