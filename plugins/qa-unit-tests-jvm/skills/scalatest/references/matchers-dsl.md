# ScalaTest - Matchers DSL

Per [scalatest.org/user_guide/using_matchers][st-matchers]:

[st-matchers]: https://www.scalatest.org/user_guide/using_matchers

```scala
result should equal(42)
result shouldBe 42                    // strict equality (uses ==)
result shouldEqual 42                  // similar to equal but no parens
result should not equal 0
list should have size 5
list should contain("alice")
list should contain only("alice", "bob")
list should contain inOrder("alice", "bob")
map should contain key("alice")
map should contain value(42)
string should startWith("hello")
string should fullyMatch regex("\\d+")
opt shouldBe defined
opt shouldBe a [Some[_]]
result shouldBe a [Right[_, _]]
either shouldBe Right(42)
result should be > 10
result should be (within(1.0) of 42.0)   // float tolerance
```

For full Matchers reference, see [st-matchers][st-matchers].
