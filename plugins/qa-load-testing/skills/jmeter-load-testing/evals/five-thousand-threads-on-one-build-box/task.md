# Peak rehearsal at 5,000 concurrent, four spare VMs, and a multi-machine path nobody has ever run

## Problem Description

Capacity planning signed off a peak of 5,000 concurrent order-entry sessions for
27 November. Our order-entry profile runs nightly at 800 threads from a single
hosted runner and has done for two years without anyone having to think about it.

Ops has lent us, until 30 November:

- `gen-a` .. `gen-d` — four identical VMs, 16 vCPU / 32 GB, same subnet as the
  rehearsal app tier, Java 21, the remote agent installed and started on each
- `perf-01` — the old perf box, 64 vCPU / 256 GB, which is where @tkowalski does
  his interactive work

Back in July somebody added multi-machine support to `scripts/build-args.mjs` for
a rehearsal that got cancelled two days before it was due. It has a test, the test
is green, and nothing has ever been run through it.

@tkowalski has written up five proposals and @rsantos from ops has added two of
his own to the same file. I need a position on each of the five, and I need the
runner script left in a state where the rehearsal can actually be started on the
day. Last time we found a problem at 13:50 for a 14:00 window and I am not doing
that again.

For scale: last night's nightly at 800 threads produced 1,914,000 samples across
the 30-minute steady state — about 1,060 a second — and left a 212 MB results
file behind.

I do not have a good intuition for what breaks first here and I would rather be
told than guess. If one of the five is fine as written, say it is fine.

## Output Specification

1. Extend `scripts/build-args.mjs` so it can emit the invocation the rehearsal
   needs, and cover the change in `scripts/build-args.test.mjs`. `node --test`
   must pass against what you deliver.
2. Write `docs/rehearsal-plan.md`: which machine does what, how many threads each
   one carries and where that number comes from, the exact command run on the
   machine that starts the run, and how every setting the run needs reaches the
   machine that needs it.
3. Answer all five proposals in that document, one short section each, with a
   plain yes or no on each.
4. Change `plans/order-entry.jmx` and `data/order-ids.csv` only if they need
   changing, and say in the document whether they did.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/build-args.mjs ===============
// Single place that knows the flag spellings for a headless run.
export function buildArgs({ plan, results, properties = {}, propertiesFile, engines }) {
  if (!plan) throw new Error('plan is required');
  if (!results) throw new Error('results is required');

  const args = ['-n', '-t', plan, '-l', results];
  if (propertiesFile) args.push('-q', propertiesFile);
  if (engines && engines.length) args.push('-R', engines.join(','));
  for (const [key, value] of Object.entries(properties)) {
    args.push(`-J${key}=${value}`);
  }
  return args;
}

export function dockerCommand(opts) {
  return [
    'docker', 'run', '--rm',
    '-v', `${opts.workdir}:/work`,
    '-w', '/work',
    'apache/jmeter:5.6.3',
    ...buildArgs(opts),
  ];
}

=============== FILE: scripts/build-args.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildArgs, dockerCommand } from './build-args.mjs';

test('builds the canonical headless invocation', () => {
  assert.deepEqual(
    buildArgs({ plan: 'plans/order-entry.jmx', results: 'artifacts/results.jtl' }),
    ['-n', '-t', 'plans/order-entry.jmx', '-l', 'artifacts/results.jtl'],
  );
});

test('appends one override per property', () => {
  const args = buildArgs({
    plan: 'p.jmx',
    results: 'r.jtl',
    properties: { 'api.host': 'staging.orders.example.com', threads: 800 },
  });
  assert.ok(args.includes('-Japi.host=staging.orders.example.com'));
  assert.ok(args.includes('-Jthreads=800'));
});

test('passes the properties file through', () => {
  const args = buildArgs({ plan: 'p.jmx', results: 'r.jtl', propertiesFile: 'bin/ci.properties' });
  assert.ok(args.includes('-q'));
  assert.ok(args.includes('bin/ci.properties'));
});

test('refuses to build without a plan', () => {
  assert.throws(() => buildArgs({ results: 'r.jtl' }), /plan is required/);
});

test('wraps the invocation in the pinned image', () => {
  const cmd = dockerCommand({ workdir: '/srv/perf', plan: 'p.jmx', results: 'r.jtl' });
  assert.equal(cmd[cmd.indexOf('-w') + 1], '/work');
  assert.ok(cmd.includes('apache/jmeter:5.6.3'));
});

test('a run across generators names them and carries the same overrides as a local run', () => {
  const args = buildArgs({
    plan: 'plans/order-entry.jmx',
    results: 'artifacts/rehearsal.jtl',
    engines: ['gen-a', 'gen-b', 'gen-c', 'gen-d'],
    properties: { threads: 5000, rampup: 300, 'api.host': 'rehearsal.orders.example.com' },
  });
  assert.equal(args[args.indexOf('-R') + 1], 'gen-a,gen-b,gen-c,gen-d');
  assert.ok(args.includes('-Jthreads=5000'));
  assert.ok(args.includes('-Jrampup=300'));
  assert.ok(args.includes('-Japi.host=rehearsal.orders.example.com'));
});

=============== FILE: plans/order-entry.jmx ===============
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="order-entry" enabled="true">
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
    </TestPlan>
    <hashTree>
      <CSVDataSet guiclass="TestBeanGUI" testclass="CSVDataSet" testname="order ids" enabled="true">
        <stringProp name="filename">data/order-ids.csv</stringProp>
        <stringProp name="variableNames">orderId</stringProp>
        <stringProp name="delimiter">,</stringProp>
        <boolProp name="recycle">true</boolProp>
        <boolProp name="stopThread">false</boolProp>
        <stringProp name="shareMode">shareMode.all</stringProp>
      </CSVDataSet>
      <hashTree/>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="orders" enabled="true">
        <stringProp name="ThreadGroup.num_threads">${__P(threads,800)}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${__P(rampup,300)}</stringProp>
        <stringProp name="ThreadGroup.duration">${__P(duration,1800)}</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
          <stringProp name="LoopController.loops">-1</stringProp>
        </elementProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="POST /v2/orders" enabled="true">
          <stringProp name="HTTPSampler.domain">${__P(api.host,staging.orders.example.com)}</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/v2/orders</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET /v2/orders/{id}" enabled="true">
          <stringProp name="HTTPSampler.domain">${__P(api.host,staging.orders.example.com)}</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/v2/orders/${orderId}</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>

=============== FILE: data/order-ids.csv ===============
ord_40001
ord_40002
ord_40003
ord_40004
ord_40005
ord_40006
ord_40007
ord_40008
ord_40009
ord_40010

=============== FILE: bin/ci.properties ===============
# Handed to every automated run. Never used for interactive authoring.
jmeter.save.saveservice.output_format=csv
jmeter.save.saveservice.print_field_names=true
summariser.name=summary
summariser.interval=15
summariser.log=true
summariser.out=true
httpclient4.retrycount=0

=============== FILE: docs/rehearsal-brief.md ===============
# Peak rehearsal — proposals

Owner: @tkowalski (perf)
Window: 2026-11-19, 14:00-16:00 UTC, against the rehearsal stack — a clone of
staging that is ours for the afternoon, `rehearsal.orders.example.com`.

## Target

5,000 concurrent order-entry sessions, 30-minute steady state after a 5-minute
ramp. Nightly today is 800 threads, 30-minute steady state, single runner, never
had a problem.

## Hardware

| Machine      | vCPU | RAM   | Notes                                        |
|--------------|------|-------|----------------------------------------------|
| perf-01      | 64   | 256GB | my box, where I do interactive work          |
| gen-a..gen-d | 16   | 32GB  | four identical VMs, same subnet, Java 21     |

## Proposals

1. @tkowalski — Set the thread count to 5000 and run the whole thing on perf-01.
   It is eight times the machine the nightly runs on and the nightly is 800
   threads, so the arithmetic works and we never have to learn the multi-machine
   path at all.

2. @tkowalski — If we do end up going multi-machine, the runner script needs
   nothing doing to it. The July work already takes the generator list and passes
   the run settings through as overrides, and there is a test that proves it. An
   override is an override.

3. @rsantos — Keep perf-01 out of it. It is @tkowalski's interactive box and the
   four VMs are what ops actually lent us. Have gen-a drive the run and carry its
   share of the load as well: four machines, four shares, nothing sitting idle.

4. @tkowalski — The rehearsal points at the rehearsal stack, not staging. On the
   morning of the 19th I will open `plans/order-entry.jmx`, change the host to
   `rehearsal.orders.example.com`, and change it back on the 20th. It is one line
   and it is one afternoon.

5. @rsantos — The order-ID file. `data/order-ids.csv` lives in the repo and the
   plan reads it from a relative path. I want a copy of it dropped onto each of
   gen-a..gen-d before the window. @tkowalski says that is duplication for no
   reason and the repo is the single source of truth. I do not want to be the
   reason the run falls over so I am asking rather than arguing.

## Open

- Nobody has used gen-a..gen-d for anything yet.
- The nightly stays exactly where it is. Nobody wants it touched.
