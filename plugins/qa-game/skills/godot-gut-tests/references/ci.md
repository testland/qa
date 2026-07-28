# GUT results parsing and CI - reference

JUnit XML output and CI wiring for godot-gut-tests.

## JUnit XML shape

GUT exports **JUnit XML** when `-gjunit_xml_file=...` is set - the recommended
CI-consumable output per [gut.readthedocs.io](https://gut.readthedocs.io/).
Top-level shape:

```xml
<testsuites name="GUT" tests="42" failures="1" disabled="0" errors="0" time="3.214">
  <testsuite name="res://test/unit/test_health.gd"
             tests="5" failures="1" errors="0" time="0.124">
    <testcase classname="test_health"
              name="test_damage_deducts_correct_amount"
              time="0.012"/>
    <testcase classname="test_health"
              name="test_clamps_below_zero"
              time="0.014">
      <failure message="Expected 0 but was -5"
               type="AssertionFailed"/>
    </testcase>
  </testsuite>
</testsuites>
```

Standard JUnit XML - consumed by GitHub Actions test reporters, Jenkins JUnit
plugin, GitLab CI test report widget, etc. Per the
[GUT README](https://github.com/bitwes/Gut), GUT also tracks pre-test errors /
orphan nodes / unhandled signals - these surface in the GUT panel and the
JUnit report.

## GitHub Actions

```yaml
jobs:
  gut-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Godot
        run: |
          GODOT=4.6.1-stable
          wget -q https://github.com/godotengine/godot/releases/download/${GODOT}/Godot_v${GODOT}_linux.x86_64.zip
          unzip -q Godot_v${GODOT}_linux.x86_64.zip -d godot
          mv "godot/Godot_v${GODOT}_linux.x86_64" godot/godot
          chmod +x godot/godot
      - name: Run GUT
        run: |
          mkdir -p artifacts
          ./godot/godot --headless -d \
            -s addons/gut/gut_cmdln.gd \
            -gdir=res://test \
            -gjunit_xml_file=artifacts/gut-junit.xml \
            -gexit
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gut-junit
          path: artifacts/gut-junit.xml
      - uses: dorny/test-reporter@v1
        if: always()
        with:
          name: GUT
          path: artifacts/gut-junit.xml
          reporter: java-junit
```

For Godot 3.x projects, swap the engine version and use GUT 7.x.
