# The lru_cache-on-an-instance-method trap (full mechanism)

The common folk description of this bug is that `self` is not part of
the cache key, so all instances share one entry. That is wrong, and the
real mechanism matters because it changes the fix.

What the Python documentation actually says:

- `functools.cached_property` "stores results at the instance level"
  and `functools.lru_cache` stores them "at the class level"
  ([Python FAQ, how do I cache method calls?](https://docs.python.org/3/faq/programming.html)).
- "If a method is cached, the `self` instance argument is included in
  the cache"
  ([functools docs](https://docs.python.org/3/library/functools.html)).
- `lru_cache` "creates a reference to the instance unless special
  efforts are made to pass in weak references", and "instances are kept
  alive until they age out of the cache or until the cache is cleared"
  ([Python FAQ](https://docs.python.org/3/faq/programming.html)).
- The arguments "must be hashable", and "Distinct argument patterns may
  be considered to be distinct calls with separate cache entries"
  ([functools docs](https://docs.python.org/3/library/functools.html)).

So the entry is keyed on the whole argument tuple, `self` included, in
one cache that lives on the class. Whether two instances collide
therefore depends entirely on how `self` hashes:

- **Default classes do not collide.** "Objects which are instances of
  user-defined classes are hashable by default. They all compare unequal
  (except with themselves), and their hash value is derived from their
  `id()`"
  ([Python glossary, hashable](https://docs.python.org/3/glossary.html)).
  Identity-based hashing means each instance gets its own entries. The
  defect here is retention, not collision: a class-level cache pins every
  request-scoped object it has seen until the entry ages out of `maxsize`.
- **Value-equality classes do collide.** "Hashable objects which compare
  equal must have the same hash value", and "Hashability makes an object
  usable as a dictionary key ... because these data structures use the
  hash value internally"
  ([Python glossary](https://docs.python.org/3/glossary.html)). A frozen
  dataclass, an attrs class, or any class with a hand-written `__eq__`
  and `__hash__` opts into value-based hashing. If the fields that
  participate in equality omit the tenant, then a repository object for
  tenant A and one for tenant B compare equal, hash equal, and share
  every cached entry. That is a genuine cross-tenant collision, and it is
  invisible in the key expression because the collision happens inside
  `__hash__`.

Fixes, in order of preference:

1. Do not cache on the instance. Make the method a module-level function
   and pass the discriminators explicitly as arguments, so the key is
   readable at the call site.
2. Use `functools.cached_property` when the value is per-instance and
   takes no arguments. It stores at the instance level and does not
   create a reference to the instance, so the result is released with the
   instance
   ([Python FAQ](https://docs.python.org/3/faq/programming.html)).
3. If the method must stay cached and the class defines value equality,
   add the missing discriminator to the equality fields so the collision
   cannot form.
