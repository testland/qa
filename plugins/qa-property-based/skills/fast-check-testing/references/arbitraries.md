# fast-check arbitraries, combinators, and composite inputs

How to build the generators passed to `fc.property(<arbitraries...>, predicate)`.

[fco]: https://fast-check.dev/

## Arbitraries catalog

Per [fast-check-overview][fco]:

| Arbitrary             | Generates                                |
|-----------------------|------------------------------------------|
| `fc.string()`          | Strings                                  |
| `fc.integer()`         | Integers                                 |
| `fc.float()` / `fc.double()` | Floats                            |
| `fc.boolean()`         | Booleans                                  |
| `fc.array(item)`       | Arrays of `item`                         |
| `fc.tuple(a, b, ...)` | Fixed-length tuples                       |
| `fc.record({ key: ... })` | Objects with specified properties     |
| `fc.option(item)`      | `item` or `null`                         |
| `fc.constantFrom(...)` | One of fixed values                      |
| `fc.oneof(a, b, ...)` | One of multiple arbitraries               |
| `fc.uuid()` / `fc.ipV4()` / `fc.emailAddress()` / `fc.webUrl()` | Format-specific |
| `fc.date()`            | Dates                                    |
| `fc.uniqueArray(item)` | Arrays without duplicates                |
| `fc.dictionary(key, value)` | Map / Record types                  |

## Combinators (.map / .chain / .filter)

Per [fast-check-overview][fco]: "Extensible via `map()` and
`chain()` combinators."

```typescript
// .map: transform a generated value
const evenInteger = fc.integer().map(n => n * 2);

// .chain: dependent generation (later value depends on earlier)
const stringWithKnownLength = fc.integer({ min: 1, max: 100 })
  .chain(len => fc.string({ minLength: len, maxLength: len }));

// .filter: reject (use sparingly - slow when filter rejects most)
const positiveInteger = fc.integer().filter(n => n > 0);
// Better:
const positiveInteger = fc.integer({ min: 1 });
```

`.filter()` discards rejections; `.map()` transforms. Prefer
`.map()` and constrained arbitraries over `.filter()` when
possible.

## Composite arbitraries via `fc.record`

```typescript
const user = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  age: fc.integer({ min: 18, max: 100 }),
  tags: fc.uniqueArray(fc.constantFrom('admin', 'beta', 'churn-risk')),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

it('serializes user to JSON and back', () => {
  fc.assert(
    fc.property(user, (u) => {
      expect(JSON.parse(JSON.stringify(u))).toEqual({
        ...u,
        createdAt: u.createdAt.toISOString(),
      });
    })
  );
});
```

`fc.record` produces objects with the specified shape; each field
is sampled per its arbitrary.
