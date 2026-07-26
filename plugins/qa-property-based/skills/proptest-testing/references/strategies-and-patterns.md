# proptest custom strategies and property patterns

Building domain strategies with `prop_compose!` and the round-trip /
invariant / equivalence property patterns they feed.

[pt]: https://github.com/proptest-rs/proptest

## Custom strategies via `prop_compose!`

```rust
use proptest::prelude::*;

prop_compose! {
    fn valid_user()(
        id in 1u64..1_000_000u64,
        email in "[a-z]{3,10}@(example|test)\\.com",
        age in 18u32..100u32,
    ) -> User {
        User { id, email, age }
    }
}

proptest! {
    #[test]
    fn user_serialization_round_trip(u in valid_user()) {
        let json = serde_json::to_string(&u).unwrap();
        let back: User = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(u, back);
    }
}
```

`prop_compose!` builds a strategy from multiple sub-strategies;
the body returns a constructed value. The `()` after the function
name is for non-generated parameters (rare).

## Round-trip and invariant patterns

Per [proptest-readme][pt]: property testing checks "that certain
properties of your code hold for arbitrary inputs."

```rust
// Round-trip
proptest! {
    #[test]
    fn json_round_trip(v in any::<Value>()) {
        let json = serde_json::to_string(&v).unwrap();
        let parsed: Value = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(v, parsed);
    }
}

// Invariant - sort produces sorted output
proptest! {
    #[test]
    fn sorted_is_sorted(mut v in prop::collection::vec(any::<i32>(), 0..1000)) {
        v.sort();
        for window in v.windows(2) {
            prop_assert!(window[0] <= window[1]);
        }
    }
}

// Equivalence - new impl matches old
proptest! {
    #[test]
    fn new_matches_old(input in any::<Input>()) {
        prop_assert_eq!(new_implementation(&input), old_implementation(&input));
    }
}
```

`prop_assert!` and `prop_assert_eq!` integrate with the shrinker
better than vanilla `assert!` - use them inside `proptest!` blocks.
