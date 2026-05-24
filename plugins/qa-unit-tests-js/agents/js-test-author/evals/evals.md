---
component: js-test-author
type: agent
archetype: A2
---

# js-test-author — evals

Companion eval cases for [`js-test-author`](../../js-test-author.md). Three
cases covering happy path + branch + adversarial. Re-run by feeding the
**Input** block as the first user message to the agent and comparing the
emitted test file against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date —
each eval is designed to be re-run against each tier.

## Eval 1 — happy path — Jest in devDeps → test(...) + expect(...).toBeNull()

**Input:**

```
Author a JS unit test for this target module.

Target module + export signature:
  src/users.js (CommonJS) exports getUserById(repo, id) -> User | null
Behavior spec: "Given an empty in-memory repo, when getUserById is called
                with any UUID, then the function returns null."
package.json path: package.json

package.json contents:
{
  "name": "user-api",
  "scripts": { "test": "jest" },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Detects Jest from the `jest` devDependency. Detects CommonJS
module context (no `"type": "module"`). Emits ONE test file using Jest's
`test(...)` or `it(...)` plus `expect(result).toBeNull()`. Emits the file at
`__tests__/users.test.js` (or co-located `src/users.test.js`). Does NOT
introduce `vitest`, `mocha`, `jasmine`, or `ava` imports. Does NOT add
`@faker-js/faker` or `msw` (neither is in deps).

**Pass condition:** Output contains the literal strings `getUserById`,
`expect(`, AND `toBeNull()`. Output does NOT contain `from 'vitest'`,
`from 'mocha'`, `import test from 'ava'`, OR `from '@faker-js/faker'`. Output
contains exactly ONE `test(` or `it(` invocation under the target name.

## Eval 2 — branch — Vitest in devDeps + TypeScript → ESM import + describe/it/expect from 'vitest'

**Input:**

```
Author a JS/TS unit test for this target module.

Target module + export signature:
  src/users.ts (ESM, TypeScript) exports getUserById(repo: UserRepo, id: string): User | null
Behavior spec: "Given an empty in-memory repo, when getUserById is called
                with any UUID, then the function returns null."
package.json path: package.json

package.json contents:
{
  "name": "user-api",
  "type": "module",
  "scripts": { "test": "vitest run" },
  "devDependencies": {
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}

A tsconfig.json is present at the project root.
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Detects Vitest from the `vitest` devDependency. Detects ESM
module context from `"type": "module"`. Detects TypeScript from tsconfig +
`.ts` source, so emits a `.test.ts` file. Uses Vitest's explicit-import
style: `import { describe, it, expect } from 'vitest'` (NOT Jest globals).
Uses Vitest's Jest-compatible matcher API: `expect(result).toBeNull()`.

**Pass condition:** Output contains the literal strings
`from 'vitest'`, `expect(`, AND `toBeNull()`. Output filename ends in
`.test.ts` (NOT `.test.js`). Output does NOT contain `from '@jest/globals'`,
`require(`, OR `from 'mocha'`. Output contains an `import { ... } from 'vitest'`
statement that includes at least `expect` (and typically `describe`, `it`).

## Eval 3 — adversarial — Jest AND Vitest both in devDeps → refuse, ask which to use

**Input:**

```
Author a JS unit test for this target module.

Target module + export signature:
  src/users.js (CommonJS) exports getUserById(repo, id) -> User | null
Behavior spec: "Given an empty in-memory repo, when getUserById is called
                with any UUID, then the function returns null."
package.json path: package.json

package.json contents:
{
  "name": "user-api",
  "scripts": { "test": "jest" },
  "devDependencies": {
    "jest": "^29.7.0",
    "vitest": "^1.6.0"
  }
}
```

**Target models:** sonnet (2026-05-24)

**Expected:** Refuses to author. Detects the conflicting framework signals
(`jest` AND `vitest` both in `devDependencies`). Asks the user which
framework to use. Does NOT silently pick one — both `jest` and `vitest`
ship near-identical `expect`/`describe`/`it` surfaces, so a wrong default
emits a file that runs under the wrong tool.

**Pass condition:** Output does NOT contain a generated test function body
(no `test(`, `it(`, OR `describe(` invocation that calls the target export).
Output contains `jest` AND `vitest` AND at least one of the words
`refuse` / `conflict` / `which` / `ambiguous` / `both` (any one — signals
the refuse-to-proceed message). Output asks the user to choose one
framework before proceeding.

## Reproducibility notes

- Inputs are concrete file contents inlined above; no external fixtures.
- Pass conditions are string-match checks on the emitted test file content
  (or, for Eval 3, on the agent's refuse-to-proceed message).
- The agent's tool surface (`Write`, `Edit`, narrow `Bash(npm test *)` /
  `Bash(npx jest *)` / etc.) writes only into the project's `__tests__/`
  or co-located source directory; eval re-runs should not modify
  production source.
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7
  sub-checks (≥3 cases, ≥1 adversarial, concrete pass conditions).
