# Kotest - matchers and isolation modes

## Matchers

Per [kotest.io/docs/assertions/matchers.html][kt-matchers]:

[kt-matchers]: https://kotest.io/docs/assertions/matchers.html

Core matchers:

| Matcher | Use |
|---|---|
| `value shouldBe expected` | Equality |
| `value shouldNotBe expected` | Inequality |
| `value should be(expected)` | Same; alternate syntax |
| `value.shouldBeNull()` / `shouldNotBeNull()` | Null check |
| `string.shouldContain("substring")` | String membership |
| `string.shouldStartWith("prefix")` / `shouldEndWith("suffix")` | String pos |
| `string.shouldMatch(regex)` | Regex |
| `list.shouldHaveSize(3)` / `shouldContainExactly(...)` / `shouldContainAll(...)` | Collection |
| `map.shouldContainKey("key")` / `shouldContainValue("v")` | Map |
| `value.shouldBeInstanceOf<MyClass>()` | Type |
| `result.shouldBeSuccess()` / `shouldBeFailure()` | Kotlin Result |
| `shouldThrow<E> { ... }` | Exception |

## Isolation modes

Per [kotest.io/docs/framework/isolation-mode.html][kt-iso]:

[kt-iso]: https://kotest.io/docs/framework/isolation-mode.html

Four modes (default `SingleInstance`):

| Mode | Behavior |
|---|---|
| `SingleInstance` | One spec instance for all tests (default; fastest) |
| `InstancePerTest` | Fresh spec instance per test (incl. nested contexts) |
| `InstancePerLeaf` | Fresh spec instance per leaf-test only |

Set per-spec:

```kotlin
class StatefulTest : StringSpec({
    isolationMode = IsolationMode.InstancePerTest
    // ...
})
```

Or globally via `AbstractProjectConfig`.
