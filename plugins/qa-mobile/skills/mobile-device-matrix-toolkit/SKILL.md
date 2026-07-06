---
name: mobile-device-matrix-toolkit
description: "Dispatches mobile UI test runs across a 3-tier device matrix (smoke per-PR, regression per-merge, full farm at release) to control CI cost: generates per-target Appium capability configs from a central YAML, parallelises via GitHub Actions matrix strategy, and aggregates JUnit XML into a cross-device pass/fail table. Use when the question is about which devices to run and when, not about how to configure a specific test framework (for that, use xcuitest-suite, espresso-suite, etc.)."
---

# mobile-device-matrix-toolkit

## Overview

Mobile testing has a combinatorial explosion problem:

- **iOS:** 5+ active OS versions × 10+ device sizes ≈ 50+ configs.
- **Android:** 8+ API levels × 100+ device profiles ≈ 800+ configs.

Running every test on every config = CI cost / time disaster.

This skill is a **dispatcher** that picks the right
subset per cadence. It wraps the per-platform test runners
([`xcuitest-suite`](../xcuitest-suite/SKILL.md),
[`espresso-suite`](../espresso-suite/SKILL.md),
[`appium-testing`](../appium-testing/SKILL.md),
[`detox-testing`](../detox-testing/SKILL.md),
[`maestro-flows`](../maestro-flows/SKILL.md)) and orchestrates
matrix execution.

## When to use

- The team's mobile suite needs cross-device / cross-OS coverage
  but blanket "run everywhere" is too expensive.
- A new device support tier (foldables, larger tablets) needs to be
  added; the matrix should grow without exploding cost.
- A device farm subscription (Firebase Test Lab, BrowserStack, AWS
  Device Farm, Sauce Labs) is paid for and the team needs a
  workflow to use it efficiently.

## Step 1 - Define the three-tier matrix

```yaml
# .matrix/devices.yaml
tier_smoke:
  description: "Per-PR - every commit. Cheap, fast feedback."
  ios:
    - { device: "iPhone 15", os: "17.4" }
  android:
    - { device: "Pixel 7", api: 34 }

tier_regression:
  description: "Per-merge to main. Wider coverage."
  ios:
    - { device: "iPhone 15", os: "17.4" }
    - { device: "iPhone SE 3rd", os: "16.0" }
    - { device: "iPad Pro 12.9", os: "17.4" }
  android:
    - { device: "Pixel 7", api: 34 }
    - { device: "Pixel 5", api: 31 }
    - { device: "Galaxy Tab S8", api: 34 }

tier_release:
  description: "Pre-release. Full matrix; runs on device farm."
  ios:
    - device: "iPhone 15", os: "17.4"
    - device: "iPhone 15 Pro Max", os: "17.4"
    - device: "iPhone 14", os: "17.0"
    - device: "iPhone 13", os: "16.0"
    - device: "iPhone SE 3rd", os: "15.0"
    - device: "iPad Pro 12.9", os: "17.4"
    - device: "iPad Mini", os: "16.0"
  android:
    - { device: "Pixel 8 Pro", api: 34 }
    - { device: "Pixel 7", api: 34 }
    - { device: "Pixel 5", api: 31 }
    - { device: "Galaxy S23", api: 33 }
    - { device: "Galaxy A54", api: 33 }
    - { device: "Pixel 4a", api: 30 }
    - { device: "Galaxy Tab S8", api: 34 }
```

Per-tier guidance:

| Tier        | When                          | iOS / Android count | Wall time | Cost (est) |
|-------------|-------------------------------|---------------------|-----------|------------|
| Smoke       | Every PR push                  | 1 / 1               | ~5 min    | local sim  |
| Regression  | Merge to main                  | 3 / 3               | ~20 min   | local sim  |
| Release     | Pre-release tag                | 7 / 7               | ~60 min   | farm       |

## Step 2 - Generate per-target capabilities

```python
# scripts/gen-matrix.py
import yaml, json, sys

cfg = yaml.safe_load(open(sys.argv[1]))
tier = sys.argv[2]   # smoke | regression | release

targets = []
for ios in cfg[f'tier_{tier}']['ios']:
    targets.append({
        'name': f"ios-{ios['device'].replace(' ', '-')}-{ios['os']}",
        'platform': 'iOS',
        'capabilities': {
            'platformName': 'iOS',
            'appium:deviceName': ios['device'],
            'appium:platformVersion': ios['os'],
            'appium:automationName': 'XCUITest',
        },
    })
for and_ in cfg[f'tier_{tier}']['android']:
    targets.append({
        'name': f"android-{and_['device'].replace(' ', '-')}-api{and_['api']}",
        'platform': 'Android',
        'capabilities': {
            'platformName': 'Android',
            'appium:deviceName': and_['device'],
            'appium:platformVersion': str(and_['api']),
            'appium:automationName': 'UiAutomator2',
        },
    })

print(json.dumps(targets))
```

CI uses this output as a matrix:

```yaml
jobs:
  generate-matrix:
    outputs:
      targets: ${{ steps.gen.outputs.targets }}
    steps:
      - id: gen
        run: |
          targets=$(python scripts/gen-matrix.py .matrix/devices.yaml ${{ inputs.tier }})
          echo "targets=$targets" >> "$GITHUB_OUTPUT"

  test:
    needs: generate-matrix
    strategy:
      fail-fast: false
      matrix:
        target: ${{ fromJSON(needs.generate-matrix.outputs.targets) }}
    runs-on: ${{ matrix.target.platform == 'iOS' && 'macos-15' || 'ubuntu-latest' }}
    name: ${{ matrix.target.name }}
    steps:
      - run: ./scripts/run-tests.sh ${{ matrix.target.name }} '${{ toJSON(matrix.target.capabilities) }}'
```

## Step 3 - Per-tier dispatch

```yaml
# .github/workflows/mobile-tests.yml
on:
  pull_request:
    paths: ['mobile/**']
  push:
    branches: [main]
  release:
    types: [created]

jobs:
  smoke:
    if: github.event_name == 'pull_request'
    uses: ./.github/workflows/run-matrix.yml
    with:
      tier: smoke

  regression:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    uses: ./.github/workflows/run-matrix.yml
    with:
      tier: regression

  release:
    if: github.event_name == 'release'
    uses: ./.github/workflows/run-matrix.yml
    with:
      tier: release
```

## Step 4 - Aggregate per-target results

Each matrix shard uploads its JUnit XML; an aggregator job combines:

```bash
# scripts/aggregate-matrix.py
import xml.etree.ElementTree as ET
from collections import defaultdict
import sys

per_target = defaultdict(lambda: {'tests': 0, 'failures': 0, 'errors': 0, 'time': 0.0})

for f in sys.argv[1:]:
    target = f.split('/')[-2]   # extract from path
    tree = ET.parse(f)
    for ts in tree.iter('testsuite'):
        per_target[target]['tests'] += int(ts.get('tests', 0))
        per_target[target]['failures'] += int(ts.get('failures', 0))
        per_target[target]['errors'] += int(ts.get('errors', 0))
        per_target[target]['time'] += float(ts.get('time', 0))

# Render matrix
print('| Target | Tests | Pass | Fail | Time |')
print('|--------|------:|-----:|-----:|-----:|')
for target, m in sorted(per_target.items()):
    pass_ = m['tests'] - m['failures'] - m['errors']
    print(f"| {target} | {m['tests']} | {pass_} | {m['failures']+m['errors']} | {m['time']:.1f}s |")
```

Output:

```markdown
| Target                          | Tests | Pass | Fail | Time   |
|---------------------------------|------:|-----:|-----:|-------:|
| ios-iPhone-15-17.4               |   42  |   42 |    0 | 320.4s |
| ios-iPhone-SE-3rd-16.0           |   42  |   41 |    1 | 295.1s |   ← Pixel 5 only
| android-Pixel-7-api34            |   42  |   42 |    0 | 280.5s |
| android-Galaxy-Tab-S8-api34      |   42  |   40 |    2 | 290.0s |   ← tablet layout issues
```

## Step 5 - Device-farm vs local emulator decision

| Use device farm when                                | Use local emulator/simulator when                  |
|-----------------------------------------------------|----------------------------------------------------|
| Real-device behavior matters (camera, sensors)      | UI logic only                                       |
| Specific OEM device under test (Samsung, foldable)  | Stock OS suffices                                   |
| iOS testing on Linux CI                              | macOS CI runner available                           |
| Release-tier matrix (cost amortizes over fewer runs) | Per-PR (cost per run too high)                     |
| Regulatory / certification testing                   | Rapid iteration                                     |

Per-farm wiring:

```yaml
# Firebase Test Lab (Android)
- run: |
    gcloud firebase test android run \
      --type instrumentation \
      --app app/build/outputs/apk/debug/app-debug.apk \
      --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
      --device model=Pixel7,version=34,locale=en \
      --device model=GalaxyS23,version=33,locale=en

# BrowserStack (iOS + Android)
- run: |
    npx browserstack-runner --config browserstack.json
```

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Same matrix for every commit                                          | CI cost explosion; team disables.                                         | Three-tier dispatch (Step 1, 3). |
| Single device per platform                                            | Misses tablet / older-OS regressions until release.                       | Regression tier covers 3 / 3 (Step 1). |
| Device-farm runs on every PR                                          | Per-minute cost; budget exhausts mid-month.                               | Farm only for release tier. |
| `fail-fast: true` on the matrix                                       | One failing target cancels others; lose coverage signal.                  | `fail-fast: false` (Step 2). |
| Hard-coded device list in CI yaml                                     | Devices added / OS versions deprecated → manual yaml updates everywhere.  | Centralized `.matrix/devices.yaml` (Step 1). |
| No aggregated report                                                   | Per-target results buried in CI logs; reviewer can't see the matrix.     | Aggregator job (Step 4). |

## Limitations

- **Cost-coverage trade-off.** Even the release tier doesn't cover
  every config. Choose representative devices per OS family.
- **Per-platform CI runner availability.** GitHub Actions macOS
  runners are paid (after free quota); large iOS matrix is
  expensive even on local sims.
- **Farm SLA varies.** Farms have queue times; release tier may
  take 1-3 hours wall-time even with parallelism.
- **Device-farm flakiness.** Real devices on shared infrastructure
  have intermittent issues; pair with retries (cautiously) and
  per-device flake tracking.

## References

- [`xcuitest-suite`](../xcuitest-suite/SKILL.md),
  [`espresso-suite`](../espresso-suite/SKILL.md),
  [`appium-testing`](../appium-testing/SKILL.md),
  [`detox-testing`](../detox-testing/SKILL.md),
  [`maestro-flows`](../maestro-flows/SKILL.md) - per-platform
  runners this dispatcher orchestrates.
- [`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md) - parser for the per-target JUnit XML aggregation.
- Per Mike Cohn's test pyramid (cited in
  [`test-pyramid-balancer`](../../../qa-process/skills/test-pyramid-balancer/SKILL.md)),
  mobile UI tests are the most expensive layer; matrix dispatch
  is the cost-management discipline.
