---
name: qt-test-framework
description: "Authors and runs Qt Test - the first-party C++ unit + GUI test framework that ships with Qt 6 (`#include <QtTest>`). Covers the `QTEST_MAIN` / `QTEST_APPLESS_MAIN` / `QTEST_GUILESS_MAIN` entry-point macros, the `QObject` private-slot test pattern, `QVERIFY` / `QCOMPARE` / `QFETCH` assertions, GUI event simulation (`QTest::mouseClick`, `QTest::keyClick`, `QTest::touchEvent`), `QSignalSpy` for signal introspection, `QBENCHMARK` for performance regression, and the `-o file,junitxml` CI output. Use for in-process testing of Qt widgets, QObject signal/slot chains, and Qt Quick / QML application logic; for out-of-process Qt-app driving see the OS drivers in this plugin."
archetype: S1
rating: 24
d6: 4
keywords:
  - qt
  - qttest
  - c++
  - qsignalspy
  - qbenchmark
  - widget-testing
---

# qt-test-framework

## Overview

Per Qt's [Qt Test overview page][qtover]:

[qtover]: https://doc.qt.io/qt-6/qtest-overview.html

> "Qt Test is a framework for unit testing Qt based applications
> and libraries."

It provides standard unit-testing primitives plus Qt-specific
extensions for GUI event simulation, data-driven tests, and
benchmarking ([qtover][qtover]).

Per the [QTest namespace reference][qtns]:

[qtns]: https://doc.qt.io/qt-6/qtest.html

> "[The QTest namespace contains] verification macros: QVERIFY,
> QVERIFY2, QCOMPARE … data handling: QFETCH, QFETCH_GLOBAL … test
> entry points: QTEST_MAIN, QTEST_GUILESS_MAIN,
> QTEST_APPLESS_MAIN."

Qt Test is **in-process** - the test executable links the Qt
application code and emits events directly into the `QObject` event
queue. It does **not** go through the OS accessibility tree (per
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)),
which means it cannot drive a Qt app from a *separate* process. For
out-of-process Qt driving see
[`winappdriver`](../winappdriver/SKILL.md) (Windows via UIA after
`QAccessible` is enabled),
[`xctest-mac-desktop`](../xctest-mac-desktop/SKILL.md) (macOS), and
[`at-spi-linux`](../at-spi-linux/SKILL.md) (Linux).

## When to use

- Pure-logic unit testing of `QObject`-based classes - view models,
  data models, signal/slot graphs.
- GUI tests of `QWidget` or Qt Quick views where the test
  executable can link the app code (in-process), avoiding the
  brittleness of out-of-process accessibility-tree drivers.
- Benchmark + performance-regression checks via `QBENCHMARK`
  ([qtns][qtns]).
- `QSignalSpy`-based assertions on signal emission order /
  arguments ([qtidx][qtidx]).

[qtidx]: https://doc.qt.io/qt-6/qttest-index.html

## Step 1 - Add Qt Test to the build

CMake (Qt 6, the canonical Qt build system per Qt 6 docs):

```cmake
find_package(Qt6 6.5 REQUIRED COMPONENTS Test Widgets)

qt_add_executable(test_calculator tst_calculator.cpp Calculator.cpp)
target_link_libraries(test_calculator PRIVATE Qt6::Test Qt6::Widgets)
add_test(NAME test_calculator COMMAND test_calculator)
```

`qt_add_executable` is the Qt-6 wrapper that handles meta-object
compilation (moc) automatically - Qt Test slot discovery depends on
moc.

## Step 2 - Author a test class

The canonical shape per [qtover][qtover] - a `QObject` subclass with
**private slots** as test functions:

```cpp
#include <QtTest/QtTest>
#include "Calculator.h"

class TestCalculator : public QObject {
    Q_OBJECT

private slots:
    // initTestCase() / cleanupTestCase() run once per class
    void initTestCase();
    void cleanupTestCase();
    // init() / cleanup() run around each test function
    void init();
    void cleanup();

    void addsTwoIntegers();
    void emitsResultChangedSignal();
    void rejectsDivisionByZero();
};

void TestCalculator::initTestCase() {
    qDebug() << "Starting test suite";
}

void TestCalculator::addsTwoIntegers() {
    Calculator c;
    QCOMPARE(c.add(2, 3), 5);     // strict equality assertion
    QVERIFY(c.lastError().isEmpty());
}

QTEST_MAIN(TestCalculator)        // generates main() + QApplication
#include "tst_calculator.moc"     // include moc output
```

The four lifecycle slots are recognised by name ([qtover][qtover]):
`initTestCase` (once before any test), `cleanupTestCase` (once
after), `init` (per test), `cleanup` (per test).

## Step 3 - Pick the right entry-point macro

Per [qtns][qtns], three entry-point macros choose what application
class the harness instantiates:

| Macro | Instantiates | Use for |
|---|---|---|
| `QTEST_MAIN` | `QApplication` | Widget GUI tests |
| `QTEST_GUILESS_MAIN` | `QCoreApplication` | Console / non-GUI logic tests |
| `QTEST_APPLESS_MAIN` | none | Tests of code that itself instantiates its own application object |

Per [qtover][qtover], if the test class defines a static public
`void initMain()` method, "it is called by the QTEST_MAIN macros
before the QApplication object is instantiated" - that's the hook
for setting platform-specific environment variables before Qt's
event loop starts.

## Step 4 - Data-driven tests

Per [qtns][qtns], `QFETCH` retrieves test data values; data is
declared in a sibling `_data()` slot:

```cpp
private slots:
    void addsTwoIntegers_data();
    void addsTwoIntegers();

void TestCalculator::addsTwoIntegers_data() {
    QTest::addColumn<int>("a");
    QTest::addColumn<int>("b");
    QTest::addColumn<int>("expected");

    QTest::newRow("zeros")       << 0 << 0  << 0;
    QTest::newRow("positives")   << 2 << 3  << 5;
    QTest::newRow("negatives")   << -2 << -3 << -5;
    QTest::newRow("overflow")    << INT_MAX << 1 << INT_MAX + 1;  // documents UB
}

void TestCalculator::addsTwoIntegers() {
    QFETCH(int, a);
    QFETCH(int, b);
    QFETCH(int, expected);
    Calculator c;
    QCOMPARE(c.add(a, b), expected);
}
```

Per [qtover][qtover]: "A test can be executed multiple times with
different test data." Each `newRow` runs the test function once.

## Step 5 - GUI event simulation

Per [qtns][qtns], the QTest namespace provides:

| Family | Functions ([qtns][qtns]) |
|---|---|
| Keyboard | `keyClick`, `keyPress`, `keyRelease`, `keyEvent`, `keySequence` |
| Mouse | `mouseClick`, `mousePress`, `mouseRelease`, `mouseMove`, `mouseDClick` |
| Touch | `touchEvent`, `createTouchDevice` |
| Wheel | `wheelEvent` (Qt 6.8+) |

```cpp
void TestLoginWidget::successfulLogin() {
    LoginWidget w;
    w.show();
    QVERIFY(QTest::qWaitForWindowExposed(&w));

    QTest::keyClicks(w.usernameField(), "alice");
    QTest::keyClicks(w.passwordField(), "s3cret");
    QTest::mouseClick(w.submitButton(), Qt::LeftButton);

    QTRY_VERIFY(w.isLoggedIn());   // polls until true or times out
    QCOMPARE(w.currentUser(), QStringLiteral("alice"));
}
```

`QTRY_VERIFY` / `QTRY_COMPARE` ([qtns][qtns]) poll the predicate
with a default 5-second timeout - the right primitive for waiting on
async signal/slot completion without ad-hoc `QTest::qWait` sleeps.

## Step 6 - Signal introspection with QSignalSpy

Per [qtidx][qtidx], QSignalSpy enables "easy introspection for Qt's
signals and slots":

```cpp
void TestCalculator::emitsResultChangedSignal() {
    Calculator c;
    QSignalSpy spy(&c, &Calculator::resultChanged);

    c.add(2, 3);

    QCOMPARE(spy.count(), 1);
    const QList<QVariant> args = spy.takeFirst();
    QCOMPARE(args.at(0).toInt(), 5);
}
```

This is the canonical pattern for asserting on signal emission
order, count, and argument values - far more robust than connecting
test-internal slots and counting invocations by hand.

## Step 7 - Benchmarks

Per [qtns][qtns], `QBENCHMARK` "executes code repeatedly to measure
performance":

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

Qt Test reports CPU time, walltime, or instructions-retired
depending on the active back-end ([qtover][qtover]). For a single-
run measurement use `QBENCHMARK_ONCE` ([qtns][qtns]).

## Step 8 - Run

Per [qtover][qtover], a Qt Test executable accepts the following
command-line options:

```bash
# List all test functions
./test_calculator -functions

# Extended verbose — shows each QCOMPARE / QVERIFY
./test_calculator -v2

# Run a specific test function
./test_calculator addsTwoIntegers

# Run a specific data row
./test_calculator addsTwoIntegers:negatives

# Write JUnit XML for CI ingestion
./test_calculator -o results.xml,junitxml
```

The `-o filename,format` flag per [qtover][qtover] supports formats:
"txt, csv, junitxml, xml, lightxml, teamcity, or tap".

For multi-binary suites, `ctest` (driven by `add_test` from Step 1)
runs the per-test executables and aggregates outcomes.

## Step 9 - Parsing results

```bash
./test_calculator -o results-junit.xml,junitxml
```

The JUnit XML output feeds
[`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md)
for cross-platform aggregation alongside other JUnit-emitting test
runners.

## Step 10 - CI integration

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

`QT_QPA_PLATFORM=offscreen` is the headless Qt platform plugin - 
required for GUI-touching Qt Test executables on hosted Linux
runners that don't have an X / Wayland session.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Public slots as test functions | moc treats them as Qt signals/slots; harness ignores them | Private slots ([qtover][qtover]) |
| Forgetting `#include "tst_xxx.moc"` for single-file tests | Linker error - moc output not bundled | Include the generated moc file at the bottom of the .cpp (Step 2) |
| `QTest::qWait(2000)` between actions | Flaky; slow on fast machines, racy on slow | `QTRY_VERIFY` / `QTRY_COMPARE` with predicate polling ([qtns][qtns]) |
| One mega-test slot exercising many flows | First failure stops the chain; coverage attribution lost | One slot per behaviour; share setup via `init()` ([qtover][qtover]) |
| Test depends on `QTimer::singleShot(0, …)` cascade | Event-loop ordering varies | Drive the event loop with `QCoreApplication::processEvents()` or `QTRY_*` predicates |
| Using `QTEST_MAIN` for headless CI | Tries to instantiate `QApplication` without a display | `QTEST_GUILESS_MAIN` for non-widget tests; `QT_QPA_PLATFORM=offscreen` for widget tests (Step 10) |
| QSignalSpy connected after the action | Misses emissions; count is wrong | Construct `QSignalSpy` *before* the action that triggers the signal (Step 6) |
| Benchmarks mixed with correctness tests in the same slot | Iteration count masks regressions | Separate `_benchmark()` slots; gate on regression in CI |

## Limitations

- **In-process only.** Qt Test links the application code into the
  test binary; it cannot drive a separately-packaged Qt app - for
  that, see the OS-native drivers in this plugin.
- **No binary compatibility guarantee.** Per [qtidx][qtidx], "no
  binary compatibility guarantee" is offered for Qt Test;
  recompile when the Qt version changes.
- **`QApplication` singleton constraint.** Multiple `QTEST_MAIN`
  test binaries cannot share a process - each test binary runs as
  its own executable (which is why `ctest` exists).
- **GUI tests need a display platform.** Headless Linux runners
  require `QT_QPA_PLATFORM=offscreen` or `xvfb-run` for widget-
  level tests.
- **No async-await ergonomics.** Qt Test predates coroutines; async
  flows use `QSignalSpy` + `QTRY_VERIFY` or explicit event-loop
  driving - clunkier than Playwright's `await`-everywhere model.
- **Localised string assertions in QCOMPARE** are brittle - 
  prefer asserting on QString identifiers (object names) or
  enum values rather than displayed text.

## References

- Qt Test overview - [qtover][qtover].
- QTest namespace reference - [qtns][qtns].
- Qt Test module index - [qtidx][qtidx].
- Sibling out-of-process Qt drivers in this plugin:
  [`winappdriver`](../winappdriver/SKILL.md),
  [`xctest-mac-desktop`](../xctest-mac-desktop/SKILL.md),
  [`at-spi-linux`](../at-spi-linux/SKILL.md).
- Strategic frame:
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
- Downstream:
  [`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).
