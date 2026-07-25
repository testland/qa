# GoogleTest advanced authoring for embedded ARM

Deep reference for the `googletest-embedded-arm` SKILL.md. Consult when the
basic `TEST()` / `TEST_F()` cases in the SKILL need value-parameterised,
typed, or death-test coverage.

## Value-parameterised tests (TEST_P)

Per [google.github.io/googletest/advanced.html](https://google.github.io/googletest/advanced.html):

```cpp
class WrapTest : public ::testing::TestWithParam<size_t> {};

TEST_P(WrapTest, WrapAtCapacity) {
    Ringbuffer<int, 4> rb;
    for (size_t i = 0; i < GetParam(); ++i) rb.push(static_cast<int>(i));
    EXPECT_EQ(std::min<size_t>(GetParam(), 4), rb.size());
}

INSTANTIATE_TEST_SUITE_P(Boundaries, WrapTest,
                         ::testing::Values(0u, 1u, 3u, 4u, 5u, 100u));
```

`INSTANTIATE_TEST_SUITE_P` is the modern macro (the older
`INSTANTIATE_TEST_CASE_P` is deprecated per the Advanced Guide). A `TEST_P`
with no `INSTANTIATE_TEST_SUITE_P` compiles but never runs - always pair them.

## Typed tests (TYPED_TEST)

Per the Advanced Guide, typed tests run "m tests over n types" without writing
m*n `TEST`s:

```cpp
template <typename T> class IntegralWrapTest : public ::testing::Test {};
using IntegralTypes = ::testing::Types<int8_t, int16_t, int32_t, int64_t>;
TYPED_TEST_SUITE(IntegralWrapTest, IntegralTypes);

TYPED_TEST(IntegralWrapTest, ZeroFits) {
    Ringbuffer<TypeParam, 8> rb;
    rb.push(0);
    EXPECT_EQ(1u, rb.size());
}
```

## Death tests

For "expected abort" code paths (assertions, fatal exits) per the Advanced
Guide:

```cpp
TEST(BufferDeathTest, NullPushAborts) {
    Ringbuffer<int, 8> *rb = nullptr;
    EXPECT_DEATH(rb->push(0), "");
}
```

Death tests fork a child process ("in separate child processes" per the
Advanced Guide); not all embedded targets support that. On bare-metal
Cortex-M there is no `fork()` - skip death tests entirely, or exclude them
with `--gtest_filter=-*DeathTest*`.
