# Unity assertion API and build-time config

## Assertion families

Per the Unity README:

| Family | Macros |
|---|---|
| **Basic validity** | `TEST_ASSERT_TRUE(c)`, `TEST_ASSERT_FALSE(c)`, `TEST_ASSERT(c)`, `TEST_FAIL()`, `TEST_IGNORE()` |
| **Equality, integer** | `TEST_ASSERT_EQUAL_INT(a,b)`, with width variants `_INT8` / `_INT16` / `_INT32` / `_INT64`; `_UINT` family analogous |
| **Equality, hex** | `TEST_ASSERT_EQUAL_HEX(a,b)`, with `_HEX8` / `_HEX16` / `_HEX32` / `_HEX64` width variants |
| **Equality, float** | `TEST_ASSERT_EQUAL_FLOAT(a,b)`, `TEST_ASSERT_EQUAL_DOUBLE(a,b)`, plus delta variants `TEST_ASSERT_FLOAT_WITHIN(delta,a,b)` |
| **String / memory** | `TEST_ASSERT_EQUAL_STRING(a,b)`, `TEST_ASSERT_EQUAL_MEMORY(a,b,len)` |
| **Pointer** | `TEST_ASSERT_NULL(p)`, `TEST_ASSERT_NOT_NULL(p)` |
| **Range** | `TEST_ASSERT_WITHIN(delta,a,b)`, `TEST_ASSERT_GREATER_THAN(a,b)`, `TEST_ASSERT_LESS_THAN(a,b)` |
| **Bitwise** | `TEST_ASSERT_BITS(mask,expected,actual)`, `TEST_ASSERT_BIT_HIGH(n,x)`, `TEST_ASSERT_BIT_LOW(n,x)` |
| **Array** | "Append `_ARRAY` or `_EACH_EQUAL` to most macros" per the README - e.g. `TEST_ASSERT_EQUAL_INT_ARRAY(expected, actual, num)` |
| **Message variant** | "All assertions support `_MESSAGE` variants" - e.g. `TEST_ASSERT_EQUAL_INT_MESSAGE(a,b,"frame count")` adds a custom failure string |

The `_MESSAGE` suffix attaches context - failures print the message inline. The `_ARRAY` suffix turns any equality macro into an array-comparing one (third arg is element count).

## Build-time configuration

Per the [Unity Configuration Guide](https://github.com/ThrowTheSwitch/Unity/blob/master/docs/UnityConfigurationGuide.md), key defines:

| Define | Effect |
|---|---|
| `UNITY_INCLUDE_DOUBLE` | Enables `_DOUBLE` assertions |
| `UNITY_FLOAT_PRECISION` | Default delta for `_WITHIN` float comparison |
| `UNITY_OUTPUT_CHAR(c)` | Redirect output (default: putchar) - set to a UART putc for bare-metal |
| `UNITY_OUTPUT_COLOR` | ANSI colour codes in output |
| `UNITY_FIXTURE_NO_EXTRAS` | Slim build for very small MCUs |
| `UNITY_EXCLUDE_SETJMP` | If toolchain has no setjmp - Unity falls back to a longjmp-free mode but loses the early-abort-on-fatal-assert behaviour |
