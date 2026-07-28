# Worked example

`createUser(email, age)`. The declared contract is `email: string` matching a
format, `age: integer, minimum 18, maximum 120`, and the function throws
`ValidationError` on a rejected input.

The suite has three tests, passing `("ada@example.com", 30)`,
`("grace@example.com", 42)`, and `("alan@example.com", 35)`, each asserting
`expect(result.id).toEqual(expect.any(String))`.

Walking the axes:

- **§EP.** `email` values are all the same length band and character class, all
  well-formed: one partition, no invalid partition. `age` values are 30, 42,
  35: same sign, same order of magnitude, all inside the valid range: one
  partition. **SHALLOW** on both parameters.
- **§BVA.** `age` declares `minimum 18` and `maximum 120`, so the partition is
  ordered and the axis applies. Required 2-value coverage items are 17, 18,
  120, 121. None is exercised. **SHALLOW**.
- **§NEG.** Three assertions, all targeting a returned value: ratio 0.
  `ValidationError` is declared and never asserted. **SHALLOW**.

Verdict: SHALLOW. The minimum set that clears the floor is one malformed
`email` (§EP invalid partition), `age=17` and `age=121` (§BVA, adding `age=18`
and `age=120` if the team holds a 3-value bar), and one assertion that a
rejected input raises `ValidationError` (§NEG).

Note how three tests bought nothing: they are one test repeated with the
literals changed. This is the pattern the literal-clustering heuristic in
Step 2 exists to name.
