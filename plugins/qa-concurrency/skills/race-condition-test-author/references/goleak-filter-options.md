# goleak filter options

Filter options for `goleak.VerifyNone` / `goleak.VerifyTestMain`, per
[pkg.go.dev/go.uber.org/goleak]. Pass one or more as trailing arguments to
suppress goroutines that are expected rather than leaked.

## IgnoreTopFunction

Ignores any goroutine whose top-of-stack frame is the named function. Prefer
this when the library goroutine is identifiable by name.

```go
goleak.VerifyNone(t,
    goleak.IgnoreTopFunction("database/sql.(*DB).connectionOpener"),
)
```

## IgnoreAnyFunction (v1.3.0+)

Ignores any goroutine whose stack contains the named function at any depth,
not just the top frame. Use when the identifying frame is not at the top.

```go
goleak.VerifyNone(t,
    goleak.IgnoreAnyFunction("google.golang.org/grpc.(*ccBalancerWrapper).watcher"),
)
```

## IgnoreCurrent

Snapshots the goroutines already running at call time and ignores exactly
those at verification.

```go
opt := goleak.IgnoreCurrent()
// ... test logic ...
goleak.VerifyNone(t, opt)
```

Prefer `IgnoreTopFunction` over `IgnoreCurrent` when the library goroutine
is identifiable by name: `IgnoreCurrent` silences goroutines that were
already running at snapshot time, which can mask leaks introduced before
the snapshot.

## Cleanup

`goleak.Cleanup(func(int))` registers a function goleak calls with the exit
code after the leak check, e.g. to log instead of failing the process. Used
with `VerifyTestMain` when the default exit behavior needs to change.

## References

- [pkg.go.dev/go.uber.org/goleak] - full API reference for `IgnoreTopFunction`,
  `IgnoreAnyFunction`, `IgnoreCurrent`, `Cleanup`

[pkg.go.dev/go.uber.org/goleak]: https://pkg.go.dev/go.uber.org/goleak
