# Nobody waits for the three-hour mutation job any more

## Problem Description

We put PIT on every pull request in `acme-platform` in March. It made sense at
the time — 16 production packages, one gate, one number. Since June the median
run is 3h12m and the thing has quietly stopped being a gate: of the last 20
merged PRs, 8 were admin-merged while the job was still running, and somebody
added a `[skip-mut]` escape hatch in July that now shows up on roughly a third
of them. I have attached the workflow, the module pom, the run durations by
month and for the last 20 PRs, the change log for the pom and the workflow, and
the tail of a recent console log.

Two proposals came out of Tuesday's platform sync and I have to answer both by
Friday.

1. Priya wants the pull-request job deleted and a single full run kept on a
   Sunday-night cron. Nobody reads the PR output anyway, and a weekly number is
   at least a number that someone might act on.
2. Marek wants to keep it per-PR but permanently cut the mutated set down to
   `com.acme.payments.*` and drop the other 15 packages. He has measured that at
   11 minutes, which is the only runtime anyone has actually produced, and he
   points out that the median PR in the attached CSV touches one package.

Both of them have thought about this harder than I have, and I am close to
taking Marek's.

The one thing I would ask you not to spend Friday on is the incremental angle.
Somebody already tried that in August — it is in the change log as PLAT-3540 —
and the monthly medians before and after are the same to within two minutes, so
I think that road is closed.

What I actually want is a pull-request job people wait for — call it under 20
minutes — and a defensible answer on both proposals. If the answer involves
changing how the CI job is invoked, spell out exactly what and where, because
the last person who touched this workflow left in August.

## Output Specification

1. Edit `.github/workflows/mutation.yml` into the arrangement you are
   recommending.
2. Edit `pom.xml` if your recommendation needs it.
3. Write `docs/mutation-ci-decision.md`: an explicit verdict on Priya's and
   Marek's proposals, what you changed and why each change is there, and the
   pull-request runtime you expect afterwards.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/mutation.yml ===============
name: Mutation coverage

on:
  pull_request:
    branches: [main]

jobs:
  mutation:
    runs-on: ubuntu-latest
    timeout-minutes: 360
    if: "!contains(github.event.pull_request.title, '[skip-mut]')"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - name: Mutation coverage
        run: mvn -B clean pitest:mutationCoverage -DwithHistory

=============== FILE: pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>acme-platform</artifactId>
  <version>11.4.0-SNAPSHOT</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.pitest</groupId>
        <artifactId>pitest-maven</artifactId>
        <version>1.17.0</version>
        <configuration>
          <targetClasses>
            <param>com.acme.*</param>
          </targetClasses>
          <targetTests>
            <param>com.acme.*Test</param>
          </targetTests>
          <mutators>
            <mutator>ALL</mutator>
          </mutators>
          <mutationThreshold>65</mutationThreshold>
          <coverageThreshold>70</coverageThreshold>
          <outputFormats>
            <format>HTML</format>
          </outputFormats>
        </configuration>
        <dependencies>
          <dependency>
            <groupId>org.pitest</groupId>
            <artifactId>pitest-junit5-plugin</artifactId>
            <version>1.2.1</version>
          </dependency>
        </dependencies>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: reports/change-log.md ===============
# acme-platform — changes to pom.xml and .github/workflows/mutation.yml

| date       | ticket    | file     | change                                                                 |
|------------|-----------|----------|------------------------------------------------------------------------|
| 2026-03-04 | PLAT-3102 | workflow | Job added on pull_request. `mvn -B clean pitest:mutationCoverage`.      |
| 2026-05-19 | PLAT-3301 | pom      | Operator set widened to the complete catalogue. "More mutants, more signal." |
| 2026-07-08 | PLAT-3455 | workflow | `[skip-mut]` opt-out added to the job `if:` after complaints.           |
| 2026-08-20 | PLAT-3540 | workflow | `-DwithHistory` appended to the run step so PRs only re-mutate changed code. |

Nothing else has been touched. The runner is the hosted `ubuntu-latest` image;
the job has never had a cache step.

=============== FILE: reports/pr-job-median-by-month.csv ===============
month,completed_runs,median_duration,note
2026-03,41,0:52:10,job added
2026-04,38,0:55:41,
2026-05,44,1:29:06,
2026-06,36,3:14:52,
2026-07,31,3:11:20,
2026-08,27,3:09:55,
2026-09,14,3:12:01,

=============== FILE: reports/pr-job-durations.csv ===============
pr,files_changed,packages_touched,duration,outcome
7731,3,1,3:04:11,merged before job finished
7733,1,1,3:19:02,passed
7736,12,2,3:22:40,merged before job finished
7738,2,1,3:07:55,passed
7740,1,1,0:00:04,skipped — [skip-mut] in PR title
7741,4,1,3:11:38,passed
7744,1,1,0:00:03,skipped — [skip-mut] in PR title
7747,8,3,3:28:19,merged before job finished
7749,2,1,3:09:47,failed (threshold)
7752,1,1,0:00:03,skipped — [skip-mut] in PR title
7755,5,2,3:14:22,merged before job finished
7757,1,1,3:02:58,passed
7760,2,1,3:12:01,merged before job finished
7763,17,4,3:41:09,passed
7766,1,1,0:00:04,skipped — [skip-mut] in PR title
7768,3,1,3:10:44,merged before job finished
7771,2,1,3:06:30,passed
7774,6,2,3:17:52,merged before job finished
7777,1,1,0:00:03,skipped — [skip-mut] in PR title
7780,2,1,3:08:16,merged before job finished

Median duration of completed runs: 3:12:01
Median files changed per PR: 2

=============== FILE: reports/pit-console-tail-pr7763.txt ===============
================================================================================
- Statistics
================================================================================
>> Line Coverage (for mutated classes only): 9,116/10,442 (87%)
>> Generated 41,880 mutations Killed 29,357 (70%)
>> Mutations with no coverage 1,904. Test strength 73%
>> Ran 214,509 tests (5.12 tests per mutation)

- Timings
> scan classpath                  : 6 seconds
> coverage and dependency analysis: 4 minutes and 11 seconds
> build mutation tests            : 1 minute and 2 seconds
> run mutation analysis           : 3 hours, 35 minutes and 50 seconds
> Total                           : 3 hours, 41 minutes and 9 seconds

(The same block from PR 7733 — 1 file changed — reports 41,880 generated and a
total of 3 hours, 19 minutes and 2 seconds.)

=============== FILE: src/main/java/com/acme/settlement/SettlementWindow.java ===============
package com.acme.settlement;

import java.time.LocalDate;

public class SettlementWindow {

    private static final int CUTOFF_HOUR = 17;

    public static boolean isOpen(LocalDate date, int hour) {
        if (date.getDayOfWeek().getValue() > 5) {
            return false;
        }
        return hour < CUTOFF_HOUR;
    }

    public static LocalDate nextSettlement(LocalDate date) {
        LocalDate next = date.plusDays(1);
        while (next.getDayOfWeek().getValue() > 5) {
            next = next.plusDays(1);
        }
        return next;
    }
}

=============== FILE: src/test/java/com/acme/settlement/SettlementWindowTest.java ===============
package com.acme.settlement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class SettlementWindowTest {

    @Test
    void openOnAWeekdayMorning() {
        assertTrue(SettlementWindow.isOpen(LocalDate.of(2026, 9, 9), 9));
    }

    @Test
    void closedAfterCutoff() {
        assertFalse(SettlementWindow.isOpen(LocalDate.of(2026, 9, 9), 17));
    }

    @Test
    void closedAtTheWeekend() {
        assertFalse(SettlementWindow.isOpen(LocalDate.of(2026, 9, 12), 9));
    }

    @Test
    void skipsTheWeekendWhenFindingTheNextSettlement() {
        assertEquals(LocalDate.of(2026, 9, 14), SettlementWindow.nextSettlement(LocalDate.of(2026, 9, 11)));
    }
}
