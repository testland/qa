# qt-test-framework - GUI events, benchmarks, and CI

Reference detail kept out of the SKILL spine. See [SKILL.md](../SKILL.md) for the
core author -> run -> parse flow (including the runnable GUI and QSignalSpy
examples).

Sources: Qt [Qt Test overview][qtover], [QTest namespace][qtns].

[qtover]: https://doc.qt.io/qt-6/qtest-overview.html
[qtns]: https://doc.qt.io/qt-6/qtest.html

## GUI event-simulation functions ([qtns][qtns])

| Family | Functions |
|---|---|
| Keyboard | `keyClick`, `keyPress`, `keyRelease`, `keyEvent`, `keySequence`, `keyClicks` |
| Mouse | `mouseClick`, `mousePress`, `mouseRelease`, `mouseMove`, `mouseDClick` |
| Touch | `touchEvent`, `createTouchDevice` |
| Wheel | `wheelEvent` (Qt 6.8+) |

`QTRY_VERIFY` / `QTRY_COMPARE` poll a predicate with a default 5-second timeout -
the primitive for waiting on async signal/slot completion without ad-hoc
`QTest::qWait` sleeps.

## Benchmarks

`QBENCHMARK` executes a code block repeatedly to measure performance; Qt Test
reports CPU time, walltime, or instructions-retired depending on the active
back-end ([qtover][qtover]). For a single-run measurement use `QBENCHMARK_ONCE`
([qtns][qtns]).

```cpp
void TestCalculator::benchmarkLargeSum() {
    Calculator c;
    QBENCHMARK {
        for (int i = 0; i < 1000; ++i) {
            c.add(i, i);
        }
    }
}
```

Keep benchmark slots separate from correctness slots so iteration counts do not
mask regressions; gate on regression in CI.

## CI integration

`QT_QPA_PLATFORM=offscreen` is the headless Qt platform plugin - required for
GUI-touching Qt Test executables on hosted Linux runners with no X / Wayland
session.

```yaml
# .github/workflows/qttest.yml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v5
      - name: Install Qt
        uses: jurplel/install-qt-action@v4
        with: { version: '6.7.0' }
      - name: Configure
        run: cmake -B build -DCMAKE_BUILD_TYPE=Release
      - name: Build
        run: cmake --build build --parallel
      - name: Run tests (Linux with offscreen)
        if: runner.os == 'Linux'
        env:
          QT_QPA_PLATFORM: offscreen
        run: ctest --test-dir build --output-on-failure --output-junit junit.xml
      - name: Run tests (Windows/macOS)
        if: runner.os != 'Linux'
        run: ctest --test-dir build --output-on-failure --output-junit junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit-${{ matrix.os }}
          path: build/junit.xml
```
