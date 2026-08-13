# Go mocking - gomock and testify/mock (reference)

Companion reference for `go-unit-tests`. A test double (per
[ISTQB Glossary][istqb-double]) replaces a real dependency so the subject
under test runs in isolation. Use when a unit test reaches a database,
HTTP client, file system, or any interface boundary; for tests that do not
cross an interface boundary, prefer real objects or simple hand-written
stubs without a mocking library.

[istqb-double]: https://glossary.istqb.org/en_US/term/test-double

| Tool | Approach |
|---|---|
| `go.uber.org/mock` (gomock + mockgen) | Codegen from interface |
| `github.com/stretchr/testify/mock` | Hand-written stub struct |

## gomock (go.uber.org/mock)

### Install and generate

Per [github.com/uber-go/mock][uber-mock-readme]:

[uber-mock-readme]: https://github.com/uber-go/mock

```bash
go get go.uber.org/mock/gomock
go install go.uber.org/mock/mockgen@latest

# Source mode: generates from a .go file
mockgen -source=internal/store/store.go \
        -destination=internal/store/mock_store.go \
        -package=store

# Package mode: package + interface names
mockgen github.com/myorg/myapp/internal/store Store,Querier \
        > internal/store/mock_store.go
```

Add a `//go:generate mockgen ...` directive so `go generate ./...` keeps
mocks in sync (generated mocks go stale when the interface changes - run
it in CI to catch drift). The `-typed` flag emits type-safe
`Return`/`Do`/`DoAndReturn` helpers.

### Test with gomock

Per [pkg.go.dev/go.uber.org/mock/gomock][uber-mock-pkg]:

[uber-mock-pkg]: https://pkg.go.dev/go.uber.org/mock/gomock

```go
func TestOrderService_Submit(t *testing.T) {
    ctrl := gomock.NewController(t)
    // ctrl.Finish() runs automatically via t.Cleanup when *testing.T is passed.

    mockStore := store.NewMockStore(ctrl)

    mockStore.EXPECT().
        SaveOrder(gomock.Any()).
        Return(nil).
        Times(1)

    svc := NewOrderService(mockStore)
    if err := svc.Submit(Order{ID: "abc"}); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}
```

### Matchers, counts, ordering

| Matcher | Behaviour |
|---|---|
| `gomock.Any()` | Any argument value |
| `gomock.Eq(v)` | Deep equality |
| `gomock.Nil()` / `gomock.Not(m)` | Nil / negation |
| `gomock.AssignableToTypeOf(v)` | Type-assignability |
| `gomock.InAnyOrder(s)` | Slice elements in any order |
| `gomock.Regex(re)` | String matches regexp |

```go
mockStore.EXPECT().FindByID(gomock.Any()).Return(nil, ErrNotFound).Times(2)
mockStore.EXPECT().Ping().MinTimes(1).MaxTimes(3)
mockStore.EXPECT().Metrics().AnyTimes()

gomock.InOrder(
    mockStore.EXPECT().Begin(),
    mockStore.EXPECT().SaveOrder(gomock.Any()).Return(nil),
    mockStore.EXPECT().Commit(),
)
```

## testify/mock (github.com/stretchr/testify)

Per [github.com/stretchr/testify][testify-readme] and
[pkg.go.dev/github.com/stretchr/testify/mock][testify-mock-pkg] - embed
`mock.Mock` and implement the interface by hand:

[testify-readme]: https://github.com/stretchr/testify
[testify-mock-pkg]: https://pkg.go.dev/github.com/stretchr/testify/mock

```go
type MockNotifier struct {
    mock.Mock
}

func (m *MockNotifier) Send(to, body string) error {
    args := m.Called(to, body)
    return args.Error(0)
}

func TestAlertService_Notify(t *testing.T) {
    n := new(MockNotifier)
    n.On("Send", "ops@example.com", mock.Anything).Return(nil)

    svc := NewAlertService(n)
    if err := svc.Notify("ops@example.com", "disk full"); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    n.AssertExpectations(t)   // every On(...) expectation was exercised
}
```

`mock.Anything` ≈ `gomock.Any()`. Also:
`n.AssertCalled(t, "Send", ...)` / `n.AssertNotCalled(t, "Send")`.

## Choosing between them

| Concern | gomock | testify/mock |
|---|---|---|
| Mock generation | `mockgen` codegen | Hand-written |
| Argument matching | Rich matcher library | `mock.Anything` + basic |
| Ordering | `InOrder`/`After` | Not built-in |
| Dependency | Two packages | One package |

gomock when strict call-order or exhaustive matching matters;
testify/mock when the team already uses `testify/assert` and wants one
dependency (hand-written stubs must be updated manually on interface
change).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mock every dependency | Tests verify mock wiring, not behavior | Mock only true isolation boundaries |
| Forget `AssertExpectations` (testify) | Uncalled `On(...)` passes silently | Always call it at the end |
| Manual `ctrl.Finish()` (gomock) | Redundant with `NewController(t)` | Remove |
| `AnyTimes()` everywhere | Hides missing invocations | Default to `Times(1)` / `MinTimes(1)` |

## References

- [uber-mock-readme][uber-mock-readme] - go.uber.org/mock README
- [uber-mock-pkg][uber-mock-pkg] - gomock package documentation
- [testify-readme][testify-readme] / [testify-mock-pkg][testify-mock-pkg] -
  testify mock docs
- [istqb-double][istqb-double] - ISTQB test-double definition
- Rust mocking (mockall) → `rust-unit-tests`
  references/rust-mocking.md
