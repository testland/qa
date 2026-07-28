# GUT assertion family - reference

Common assertions for godot-gut-tests, per
[gut.readthedocs.io](https://gut.readthedocs.io/) and the
[GUT README](https://github.com/bitwes/Gut). The README notes GUT exposes
"a plethora of asserts and utility methods" - check the `addons/gut/test.gd`
source in your installed version for the complete signature list at the engine
version you ship against.

| Assertion | Use |
|---|---|
| `assert_eq(a, b, msg)` | Equality |
| `assert_ne(a, b, msg)` | Inequality |
| `assert_almost_eq(a, b, tol, msg)` | Float comparison within tolerance |
| `assert_true(v, msg)` / `assert_false(v, msg)` | Boolean |
| `assert_null(v, msg)` / `assert_not_null(v, msg)` | Null check |
| `assert_has(coll, v, msg)` / `assert_does_not_have(coll, v, msg)` | Membership |
| `assert_signal_emitted(obj, "signal_name", msg)` | Signal emission |
| `assert_signal_emitted_with_parameters(obj, "name", args, msg)` | Signal emission with payload |
| `assert_gt(a, b, msg)` / `assert_lt(a, b, msg)` | Ordering |
| `assert_called(double, "method_name", args)` | Spy verification |

Use `assert_almost_eq(a, b, tol)` for floats - `assert_eq` fails on
floating-point inequality.
