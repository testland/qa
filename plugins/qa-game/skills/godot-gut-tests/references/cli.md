# GUT command-line runner - flag and config reference

Full flag list and config schema for godot-gut-tests. The CLI runner is
invoked via `-d -s addons/gut/gut_cmdln.gd` plus GUT-specific options, per
[gut.readthedocs.io](https://gut.readthedocs.io/).

## CLI flags

| Flag | Effect |
|---|---|
| `-gdir=res://test` | Recurse this directory for tests |
| `-gtest=res://test/unit/test_health.gd` | Run a single test script |
| `-ginner_class=TestAddItem` | Limit to one inner class |
| `-gunit_test_name=test_increases_count_by_stack` | Limit to one test method |
| `-gconfig=res://.gutconfig.json` | Load config from JSON |
| `-gjunit_xml_file=artifacts/gut-junit.xml` | Write JUnit XML report |
| `-gjunit_xml_timestamp` | Add timestamp suffix to filename |
| `-glog=3` | Log verbosity (0 - 3) |
| `-gexit` | Exit Godot after run (essential in CI) |

`--headless` runs Godot without a display window - required for most CI
environments. `-d` runs in debug mode so the test runner script
(`addons/gut/gut_cmdln.gd`) executes.

## Config file

A `.gutconfig.json` at the project root lets the GUT panel and CLI runner share
settings:

```json
{
  "dirs": ["res://test/unit", "res://test/integration"],
  "include_subdirs": true,
  "log_level": 1,
  "junit_xml_file": "artifacts/gut-junit.xml",
  "double_strategy": "partial"
}
```

Field names per [gut.readthedocs.io](https://gut.readthedocs.io/) - check your
installed `addons/gut/` version for the authoritative schema.
