# The nightly search soak has not completed once since we extended it, and four fixes have not helped

## Problem Description

On 1 September we extended the nightly search soak from a 20-minute steady state
to 90 minutes, because the connection-pool leak we have been chasing only shows
up after about an hour. Since that change the job has not completed once. It runs
normally for a while, the periodic progress lines keep coming, and then it dies.
Thursday night's log is attached.

We have already tried four things and the list is attached too. None of them
worked, two of them cost us goodwill with other teams, and I would like the next
thing we try to be the right one rather than the fifth.

Three constraints I cannot move:

- The 90-minute steady state. That was the entire point of the change.
- Hardware spend is frozen until Q1. The build agent is self-hosted, 8 GB, and
  shared with the mobile and platform teams' builds.
- The team reads the response-time-over-time graph and the per-endpoint table
  after every run. That is the whole reason anybody still looks at this job.

Two open questions on top of the failure itself, both of which I have to settle
this week:

- @rsantos wants the JVM allocation put back to what it was before 5 September
  and the gigabyte handed back to the mobile team, whose builds have been slower
  since we took it. @tkowalski says we cannot give memory back while we are still
  falling over.
- @jlind has proposed we accept that 90 minutes does not work on this agent, go
  back to a 20-minute steady state — the only configuration that has ever
  completed — and chase the leak some other way.

For reference: the last run that finished, on 20 August and still on the
20-minute profile, left a 2.1 GB results file behind. Nobody thought that was
odd at the time.

One more thing. We have a small linter that runs over the plan on every pull
request, and whatever is wrong here got merged past it on 1 September. I would
like it not to get past it next time.

## Output Specification

1. Change `plans/search-soak.jmx` so the nightly finishes on the agent we have.
2. Change `ci/run-soak.sh` and `bin/soak.properties` as far as they need changing.
3. Add a rule to `tools/plan-lint.mjs` that would have rejected the plan as it
   stands, and cover it in `tools/plan-lint.test.mjs`. `node --test` must pass
   when you are done, including the tests already there.
4. Write `docs/soak-oom.md`: what actually consumed the memory, what you changed,
   exactly how the team gets the response-time graph and the per-endpoint table
   after each run from here on, and a plain answer to each of the two open
   questions above.

## Input Files

Extract the following files before beginning.

=============== FILE: plans/search-soak.jmx ===============
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="search-soak" enabled="true">
      <boolProp name="TestPlan.functional_mode">false</boolProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="search" enabled="true">
        <stringProp name="ThreadGroup.num_threads">${__P(threads,240)}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${__P(rampup,120)}</stringProp>
        <stringProp name="ThreadGroup.duration">${__P(duration,5400)}</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
          <stringProp name="LoopController.loops">-1</stringProp>
        </elementProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET /search" enabled="true">
          <stringProp name="HTTPSampler.domain">${__P(api.host,staging.search.example.com)}</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/search</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET /search/suggest" enabled="true">
          <stringProp name="HTTPSampler.domain">${__P(api.host,staging.search.example.com)}</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/search/suggest</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET /search/facets" enabled="true">
          <stringProp name="HTTPSampler.domain">${__P(api.host,staging.search.example.com)}</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/search/facets</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
      </hashTree>
      <ResultCollector guiclass="StatVisualizer" testclass="ResultCollector" testname="Aggregate Report" enabled="false">
        <boolProp name="ResultCollector.error_logging">false</boolProp>
        <objProp>
          <name>saveConfig</name>
          <value class="SampleSaveConfiguration">
            <time>true</time>
            <latency>true</latency>
          </value>
        </objProp>
        <stringProp name="filename"></stringProp>
      </ResultCollector>
      <hashTree/>
      <ResultCollector guiclass="RespTimeGraphVisualizer" testclass="ResultCollector" testname="Response Time Graph" enabled="false">
        <boolProp name="ResultCollector.error_logging">false</boolProp>
        <objProp>
          <name>saveConfig</name>
          <value class="SampleSaveConfiguration">
            <time>true</time>
            <latency>true</latency>
          </value>
        </objProp>
        <stringProp name="filename"></stringProp>
      </ResultCollector>
      <hashTree/>
      <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="false">
        <boolProp name="ResultCollector.error_logging">false</boolProp>
        <objProp>
          <name>saveConfig</name>
          <value class="SampleSaveConfiguration">
            <time>true</time>
          </value>
        </objProp>
        <stringProp name="filename"></stringProp>
      </ResultCollector>
      <hashTree/>
      <ResultCollector guiclass="ViewResultsFullVisualizer" testclass="ResultCollector" testname="Results Writer" enabled="true">
        <boolProp name="ResultCollector.error_logging">false</boolProp>
        <objProp>
          <name>saveConfig</name>
          <value class="SampleSaveConfiguration">
            <time>true</time>
            <latency>true</latency>
            <responseData>true</responseData>
            <samplerData>true</samplerData>
            <assertions>true</assertions>
          </value>
        </objProp>
        <stringProp name="filename">artifacts/soak-tree.jtl</stringProp>
      </ResultCollector>
      <hashTree/>
    </hashTree>
  </hashTree>
</jmeterTestPlan>

=============== FILE: ci/run-soak.sh ===============
#!/usr/bin/env bash
set -euo pipefail

# Nightly search soak. Runs on the shared self-hosted agent (8 GB total).
# We take 3 GB of it; mobile and platform builds need the rest.
export JVM_ARGS="-Xms512m -Xmx3g"

WORKSPACE="${WORKSPACE:-/srv/agent/workspace/search-soak}"

# artifacts/soak-tree.jtl is the file the team downloads after a run.
# Do not remove the Results Writer element from the plan.
/opt/jmeter/bin/jmeter \
  -n -t "$WORKSPACE/plans/search-soak.jmx" \
  -l "$WORKSPACE/artifacts/soak.jtl" \
  -q "$WORKSPACE/bin/soak.properties" \
  -Japi.host=staging.search.example.com \
  -Jduration=5400

echo "soak finished"

=============== FILE: bin/soak.properties ===============
# Properties for the nightly soak.
jmeter.save.saveservice.output_format=xml
jmeter.save.saveservice.response_data=true
jmeter.save.saveservice.samplerData=true
jmeter.save.saveservice.assertion_results=all
summariser.name=summary
summariser.interval=60
summariser.log=true
httpclient4.retrycount=0

=============== FILE: ci/agent-runbook.md ===============
# build-agent-02 — read this before you add a step

- The workspace at `/srv/agent/workspace` is not cleaned between builds. Nothing
  on this agent cleans it. If a step needs an empty directory it has to make one
  itself.
- `/srv/agent/workspace/.cache` is shared by the mobile and platform pipelines.
  Anything that removes the workspace, or clears its contents wholesale, takes
  their caches with it. #build-infra has asked twice that nobody do this.
- Disk is 200 GB and 71% used. The search soak's `artifacts` directory is the
  largest single consumer on the box.
- The agent runs one job at a time, so there is no concurrency to design around.
- JVM allocation for a job is set by the job's own script, not by the agent.

=============== FILE: reports/soak-attempts.md ===============
# What we have already tried

| Date       | Change                                                          | Result                                        |
|------------|-----------------------------------------------------------------|-----------------------------------------------|
| 2026-09-01 | Steady state 20 min -> 90 min                                    | job stopped completing, dies around 40 min    |
| 2026-09-03 | Disabled the listener elements in the plan that nobody was using | still dies, now around 55 min instead of 40   |
| 2026-09-05 | JVM allocation 2g -> 3g, taken from the mobile team's share      | still dies around 55 min, no improvement worth reporting |
| 2026-09-08 | Asked finance for a bigger agent                                 | refused, spend frozen until Q1                |

Notes:

- The 3 September change was done by @tkowalski from the plan file directly. He
  has said he left the one element that is "actually doing something".
- The 5 September change is the one @rsantos wants reverted.
- Throughput has been the same on every run since 1 September, before and after
  each of these changes.

=============== FILE: logs/soak-2026-09-10.log ===============
2026-09-10 02:00:11 INFO o.a.j.JMeter: Starting the test
2026-09-10 02:00:12 INFO o.a.j.e.StandardJMeterEngine: Running the test!
2026-09-10 02:02:12 INFO o.a.j.r.Summariser: summary +  41204 in 00:02:00 =  343.4/s Avg:   181 Min:    22 Max:  2104 Err:     0 (0.00%)
2026-09-10 02:12:12 INFO o.a.j.r.Summariser: summary + 205918 in 00:10:00 =  343.2/s Avg:   184 Min:    21 Max:  2288 Err:     0 (0.00%)
2026-09-10 02:22:12 INFO o.a.j.r.Summariser: summary + 205744 in 00:10:00 =  342.9/s Avg:   186 Min:    21 Max:  3012 Err:     0 (0.00%)
2026-09-10 02:32:12 INFO o.a.j.r.Summariser: summary + 204011 in 00:10:00 =  340.0/s Avg:   199 Min:    22 Max:  6640 Err:     0 (0.00%)
2026-09-10 02:42:12 INFO o.a.j.r.Summariser: summary + 204880 in 00:10:00 =  341.5/s Avg:   194 Min:    21 Max:  4180 Err:     0 (0.00%)
2026-09-10 02:50:41 WARN o.a.j.t.JMeterThread: GC overhead climbing; last full GC took 4812 ms
2026-09-10 02:55:37 ERROR o.a.j.JMeter: Uncaught exception in thread Thread-14
java.lang.OutOfMemoryError: Java heap space
	at java.base/java.util.Arrays.copyOf(Arrays.java:3537)
	at java.base/java.lang.AbstractStringBuilder.ensureCapacityInternal(AbstractStringBuilder.java:237)
	at java.base/java.lang.StringBuilder.append(StringBuilder.java:174)
	at org.apache.http.util.EntityUtils.toString(EntityUtils.java:365)
	at org.apache.jmeter.protocol.http.sampler.HTTPHC4Impl.readResponse(HTTPHC4Impl.java:812)
	at org.apache.jmeter.protocol.http.sampler.HTTPSamplerProxy.sample(HTTPSamplerProxy.java:74)
	at org.apache.jmeter.threads.JMeterThread.executeSamplePackage(JMeterThread.java:638)
2026-09-10 02:55:39 ERROR o.a.j.JMeter: Test run aborted

=============== FILE: tools/plan-lint.mjs ===============
// Structural checks over a .jmx before it reaches CI. Deliberately regex-based:
// the build agent has no XML parser dependency and we are not adding one.

export const rules = [
  {
    id: 'threadgroup-duration',
    describe: 'every ThreadGroup sets a scheduler duration',
    check(xml) {
      const groups = xml.match(/<ThreadGroup\b[\s\S]*?<\/ThreadGroup>/g) ?? [];
      return groups
        .filter((g) => !/ThreadGroup\.duration">\s*[^<\s]/.test(g))
        .map(() => 'a ThreadGroup has no scheduler duration');
    },
  },
];

export function lint(xml) {
  return rules.flatMap((rule) =>
    rule.check(xml).map((message) => ({ rule: rule.id, message })),
  );
}

=============== FILE: tools/plan-lint.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lint, rules } from './plan-lint.mjs';

const withDuration = `
<ThreadGroup testname="ok">
  <stringProp name="ThreadGroup.num_threads">10</stringProp>
  <stringProp name="ThreadGroup.duration">600</stringProp>
</ThreadGroup>`;

const withoutDuration = `
<ThreadGroup testname="bad">
  <stringProp name="ThreadGroup.num_threads">10</stringProp>
  <stringProp name="ThreadGroup.duration"></stringProp>
</ThreadGroup>`;

test('a thread group with a duration passes', () => {
  assert.deepEqual(lint(withDuration), []);
});

test('a thread group without a duration is flagged', () => {
  const found = lint(withoutDuration);
  assert.equal(found.length, 1);
  assert.equal(found[0].rule, 'threadgroup-duration');
});

test('rule ids are unique', () => {
  const ids = rules.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the shipped soak plan passes every rule', () => {
  const xml = readFileSync(new URL('../plans/search-soak.jmx', import.meta.url), 'utf8');
  assert.deepEqual(lint(xml), []);
});
