---
name: ceedling-mocks-reference
description: "Pure-reference catalog of CMock and Ceedling mocking semantics for C. Defines what CMock generates from a C header (the full Expect / ExpectAndReturn / ExpectAnyArgs / ExpectWithArray / Ignore / IgnoreAndReturn / IgnoreArg_<param> / ReturnThruPtr_<param> / AddCallback / Stub / ExpectAndThrow naming family), the cmock.yml :plugins list (ignore, ignore_stateless, ignore_arg, expect_any_args, array, callback, cexception, return_thru_ptr) and what each enables, mock-suffix and mock-prefix conventions, how Unity teardown validates expectations, the resetTest mid-test verification, strict vs ignore argument-matching modes, and the trade-offs between mock / stub / spy / fake. Use as the CMock semantics reference when authoring Ceedling tests with mocks or when reading an unfamiliar mock-driven test suite."
metadata:
  keywords: "cmock, ceedling, unity, mocks, stubs, c, embedded, throwtheswitch"
---

# ceedling-mocks-reference

## Overview

CMock is, per
[github.com/ThrowTheSwitch/CMock](https://github.com/ThrowTheSwitch/CMock),
"a mock and stub generator and runtime for unit testing C" that
"automagically parses your C headers and creates useful and usable
mock interfaces for unit testing". Ceedling, per
[throwtheswitch.org/ceedling](https://www.throwtheswitch.org/ceedling),
is "a Build System for GROWING ROBUST C Projects" that "starts
with the Unity test framework and CMock mock and stub generation,
then adds a build system for coordinating, executing, and
summarizing test and release builds".

This skill is a **pure reference** for CMock's generated API
surface and the cmock.yml plugin model. The per-tool
counterparts are
[`ceedling-build-runner`](../ceedling-build-runner/SKILL.md) (the
build orchestration) and
[`unity-test-framework-c`](../unity-test-framework-c/SKILL.md)
(the assertion API).

## When to use

- Reading a Ceedling test suite and decoding which CMock plugin
  produced which API.
- Authoring a new mock for a C module - choosing between strict
  expectations, ignored arguments, return-thru-pointer.
- Configuring `project.yml` / `cmock.yml` plugins for the level
  of strictness the team wants.
- Migrating a legacy fake-by-hand to a CMock-generated mock.
- Distinguishing mock / stub / spy / fake in C, where the
  vocabulary is fuzzier than in OO languages.

## Mock / Stub / Spy / Fake in C

| Term | Behaviour | CMock realisation |
|---|---|---|
| **Stub** | Returns canned values; doesn't fail the test | `func_IgnoreAndReturn(value)` - no expectation, just a default return |
| **Mock (strict)** | Verifies exact call + args; fails test if unmatched | `func_Expect(args)` / `func_ExpectAndReturn(args, ret)` |
| **Spy** | Records calls for later inspection | `func_AddCallback(cb)` - callback that records into test-scope state |
| **Fake** | Lightweight reimplementation | `func_Stub(impl)` - replace the function with a custom C implementation |

The English vocabulary is from Meszaros's xUnit Test Patterns;
CMock encodes all four shapes through one generated family.

## What CMock generates from a header

Given `parser.h`:

```c
int parse_message(const char *buf, size_t len, message_t *out);
```

CMock generates `mock_parser.h` and `mock_parser.c`. The
generated API for `parse_message` is (per
[github.com/ThrowTheSwitch/CMock/blob/master/docs/CMock_Summary.md](https://github.com/ThrowTheSwitch/CMock/blob/master/docs/CMock_Summary.md)):

```c
// Strict expectations
void parse_message_Expect(const char *buf, size_t len, message_t *out);
void parse_message_ExpectAndReturn(const char *buf, size_t len, message_t *out, int retval);

// Argument-flexibility (requires :expect_any_args plugin)
void parse_message_ExpectAnyArgs(void);
void parse_message_ExpectAnyArgsAndReturn(int retval);

// Array depth (requires :array plugin)
void parse_message_ExpectWithArray(const char *buf, int buf_depth, size_t len, message_t *out, int out_depth);
void parse_message_ExpectWithArrayAndReturn(const char *buf, int buf_depth, size_t len, message_t *out, int out_depth, int retval);

// Per-argument ignore (requires :ignore_arg plugin)
void parse_message_IgnoreArg_buf(void);
void parse_message_IgnoreArg_len(void);
void parse_message_IgnoreArg_out(void);

// Whole-function ignore (requires :ignore or :ignore_stateless plugin)
void parse_message_Ignore(void);
void parse_message_IgnoreAndReturn(int retval);
void parse_message_StopIgnore(void);

// Pointer-return injection (requires :return_thru_ptr plugin)
void parse_message_ReturnThruPtr_out(message_t *val_to_return);
void parse_message_ReturnArrayThruPtr_out(message_t *val_to_return, int len);
void parse_message_ReturnMemThruPtr_out(message_t *val_to_return, size_t size);

// Callback / stub (requires :callback plugin)
void parse_message_AddCallback(CMOCK_parse_message_CALLBACK callback);
void parse_message_Stub(CMOCK_parse_message_CALLBACK callback);

// Exception throwing (requires :cexception plugin)
void parse_message_ExpectAndThrow(const char *buf, size_t len, message_t *out, CEXCEPTION_T value_to_throw);
```

All of the above family names are cited from the CMock Summary
doc above. The generated function names follow the rigid pattern
`<original_function_name>_<CMockVerb>[_<paramName>]`.

## cmock.yml `:plugins` list

Each generated API family is gated on a plugin in cmock.yml
(typically inlined into Ceedling's `project.yml` under
`:cmock: :plugins:` - per the same CMock summary doc):

| Plugin | Enables | When to enable |
|---|---|---|
| `:ignore` | `_Ignore`, `_IgnoreAndReturn`, `_StopIgnore` (stateful) | When you want unmatched calls to a function to pass after `_Ignore` is called |
| `:ignore_stateless` | Same API as `:ignore` but no per-test state | Faster; use when ignored functions are uninteresting |
| `:ignore_arg` | `_IgnoreArg_<param>` | When a specific argument isn't part of the assertion |
| `:expect_any_args` | `_ExpectAnyArgs`, `_ExpectAnyArgsAndReturn` | When call *count* matters but args don't |
| `:array` | `_ExpectWithArray`, `_ReturnArrayThruPtr_<param>` | When arguments are pointer-to-array of known depth |
| `:callback` | `_AddCallback`, `_Stub` | When you need to capture calls or substitute a fake |
| `:cexception` | `_ExpectAndThrow` | When the module under test propagates CException throws |
| `:return_thru_ptr` | `_ReturnThruPtr_<param>`, `_ReturnMemThruPtr_<param>` | When the mocked function writes through an out-pointer |

A minimal cmock.yml for a typical embedded suite:

```yaml
:cmock:
  :mock_prefix: Mock
  :mock_suffix: ""
  :plugins:
    - :ignore
    - :ignore_arg
    - :expect_any_args
    - :array
    - :callback
    - :return_thru_ptr
```

`:cexception` is added only if the project uses CException.

## Mock-naming convention

Per the CMock summary doc, the mock module name is built from
`:mock_prefix` + original module name + `:mock_suffix`. With the
default `:mock_prefix: Mock`:

| Original | Generated mock module |
|---|---|
| `parser.h` | `Mockparser.h` and `Mockparser.c` |
| `i2c_driver.h` | `Mocki2c_driver.h` and `Mocki2c_driver.c` |

In a test (`test_consumer.c`), include the mock header:

```c
#include "unity.h"
#include "Mockparser.h"      // CMock-generated
#include "consumer.h"        // under test
```

Ceedling automatically detects the `Mock*` include and generates
the mock at test-build time.

## Test lifecycle: setUp / tearDown / resetTest

CMock hooks into Unity's per-test lifecycle:

| Hook | What CMock does |
|---|---|
| `setUp()` | (Optional) `Mockparser_Init()` clears prior expectations - Ceedling generates this automatically when test_runner is generated |
| `tearDown()` | `Mockparser_Verify()` asserts every queued expectation was matched; fails the test via Unity assertion if not |
| `resetTest()` (mid-test) | Per the CMock summary doc, "Call it during a test to have CMock validate everything to this point and start over clean" - useful for staged interaction tests |

Forgetting to register a mock causes link errors, not test
failures - the mock is the only definition of the symbol.

## Argument-matching modes

CMock's default mode is **strict by argument**: passed arguments
must `memcmp`-equal the expected. The user softens with:

| Softener | Effect |
|---|---|
| `_IgnoreArg_<param>` | This call's `<param>` is not checked |
| `_ExpectAnyArgs` | None of this call's args are checked |
| `_Ignore` / `_IgnoreAndReturn` | All subsequent calls to this function are ignored until `_StopIgnore` |
| Custom matcher via `_AddCallback` | Inspect args programmatically and return a comparison |

For pointer arguments to structs, the default is **deep-equal by
size** - CMock memcompares the pointed-to memory. For string
pointers, treat as `strcmp` only if the deep-equal of the buffer
matches the string length CMock chose at generation; in practice,
use `_IgnoreArg_<param>` + a `_AddCallback` for string-matching.

## Worked example

A consumer module that calls a parser; the test verifies the
expected call shape:

```c
// consumer.h - under test
int consume(const char *raw);

// consumer.c
#include "parser.h"
int consume(const char *raw) {
    message_t m;
    if (parse_message(raw, strlen(raw), &m) != 0) return -1;
    return m.kind;
}

// test_consumer.c
#include "unity.h"
#include "Mockparser.h"
#include "consumer.h"

void test_consume_returns_kind_on_success(void) {
    message_t out_fixture = { .kind = 7 };

    parse_message_ExpectAndReturn("PING", 4, NULL, 0);
    parse_message_IgnoreArg_out();
    parse_message_ReturnThruPtr_out(&out_fixture);

    TEST_ASSERT_EQUAL_INT(7, consume("PING"));
}

void test_consume_returns_negative_one_on_parse_error(void) {
    parse_message_ExpectAnyArgsAndReturn(-1);
    TEST_ASSERT_EQUAL_INT(-1, consume("BADINPUT"));
}
```

The first test: strict on `buf` + `len`, lenient on `out`, then
write the fixture through the out-pointer. The second: count
matters, args don't.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mocking everything | Tests become assertion-by-mock; refactors break dozens of mocks | Mock only the boundary (driver, peripheral, OS call); leave pure logic un-mocked |
| `_ExpectAnyArgs` everywhere | "Test passes" but coverage of expected call shape is zero | Use strict `_Expect` for the *interesting* args; ignore only the noisy ones |
| `_Ignore` left on globally | Real defects in the SUT-mock interaction are hidden | Pair `_Ignore` with a clear narrative comment; prefer `_IgnoreAndReturn` once-per-test |
| Mock-side state mutation through `_Stub` | Tests rely on stub side-effects across calls; hard to reason about | Use `_AddCallback` to record calls explicitly; assert on the record at the end |
| Forgetting to enable a plugin then using its API | Compile fails on unknown function | Audit `:cmock: :plugins:` whenever a test uses a new `_IgnoreArg_*` or `_ReturnThruPtr_*` |
| Mocking standard-library functions | Pulls libc into mock generation; coverage explodes | Wrap libc behind a project-owned header (e.g. `time_provider.h`) and mock that |
| Asserting `Mockxxx_Init` not called | Init is generated by Ceedling, not part of the API contract | Don't assert on `_Init` / `_Destroy`; assert on the domain calls |

## Limitations

- **CMock parses C headers, not preprocessed source.** Macros
  that hide function declarations are invisible - generators
  miss them.
- **Function pointers in structs need explicit handling.** CMock
  generates a per-symbol mock; a function-pointer field in a
  struct is not a symbol and isn't directly mockable. Define a
  typed wrapper.
- **Vararg functions partially supported.** Per the CMock
  summary doc, vararg mocking is limited; consider wrapping a
  vararg function before mocking.
- **Generated code grows with module size.** A 200-function
  header produces ~200×8 generated functions; build time matters.
  Split the header.
- **Argument-deep-compare can be misleading on structs with
  pointer members.** The pointed-to memory is *not* recursively
  compared - only the pointer value. Use `_AddCallback` for
  structures-with-pointers.
- **Not thread-safe.** CMock's expectation queue is per-process
  global state; concurrent tests in the same process collide.
  Ceedling runs tests serially by default - keep it that way.

## References

Cited inline. Foundational documents:

- CMock Summary (full API surface) - 
  [github.com/ThrowTheSwitch/CMock/blob/master/docs/CMock_Summary.md](https://github.com/ThrowTheSwitch/CMock/blob/master/docs/CMock_Summary.md).
- CMock README - 
  [github.com/ThrowTheSwitch/CMock](https://github.com/ThrowTheSwitch/CMock).
- Ceedling overview - [www.throwtheswitch.org/ceedling](https://www.throwtheswitch.org/ceedling).
- Sibling skills:
  [`ceedling-build-runner`](../ceedling-build-runner/SKILL.md),
  [`unity-test-framework-c`](../unity-test-framework-c/SKILL.md).
- Pattern taxonomy: Gerard Meszaros, *xUnit Test Patterns*
  (book, cite by ISBN 978-0131495050).
