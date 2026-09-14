# One parameterised orders plan, a guard that has been green since August, and an environment that fell over anyway

## Problem Description

Until August we had three files under `plans/` that were the same six samplers
three times over, differing in the host they point at, the port, and a service
token pasted into a header. In August @lpereira consolidated them into one
parameterised `plans/orders.jmx`, wired the workflow to pass the
environment-specific values in on the command line, and wrote
`scripts/check-envs.mjs` in the same week so that this could not quietly go wrong
again. The old files are still sitting in the repo; nobody got round to deleting
them.

EU staging went live on 2026-09-08 and got a job the same day. EU is provisioned
at roughly a fifth of US staging, so @rsantos in SRE put it in writing that the
standard 400-thread profile must not be pointed at it, and the EU job was given
its own smaller number.

At 02:02 on Friday 2026-09-11 EU staging stopped serving. On-call was paged, it
recovered at 02:17 when the nightly window ended, and the incident note is
attached. It is not a mystery who did it — the only thing hitting that host at
two in the morning is us.

The guard has been green every night since it was written, including that one.

TICKET-4471 landed on Wednesday and I owe @dmorel an answer by Friday. It has
four asks. Two of them I think are wrong and I cannot articulate why, one I think
is right and my team will hate, and one I genuinely do not have a view on. He is
not being unreasonable — after Friday night his first ask is a lot more appealing
than it was on Wednesday.

Other things worth knowing before you read it:

- In July, before the consolidation, the orders endpoint moved from `/v1/orders`
  to `/v2/orders`. Two of the three files got updated. The dev one did not, and
  because the service still answers the old path through a deprecation shim,
  nothing failed, nothing errored, and for six weeks the dev run was exercising
  an endpoint that is not the one we ship. We found it by accident.
- The service token rotates every 90 days. The next rotation is 2026-10-01.

Give me a straight answer on each of the four asks. If one of them is fine as
written, say so.

## Output Specification

1. Leave `plans/` in whatever state you think it should be in for the four
   environments we have and the two that are coming.
2. Update `.github/workflows/orders-load.yml` to match.
3. `scripts/check-envs.mjs` exists to stop an environment-specific value going
   astray between the workflow and the plan. Leave it and
   `scripts/check-envs.test.mjs` in whatever state you think they should be in.
   `node --test` must pass against what you deliver.
4. Write `docs/orders-load.md`: how to run against each environment, where every
   environment-specific value comes from, what happens if somebody runs it with
   one of them missing, what the EU job actually ran on the night of the 11th and
   why, and one short section per ask in TICKET-4471 with a plain yes or no on
   each.

## Input Files

Extract the following files before beginning.

=============== FILE: plans/orders.jmx ===============
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="orders" enabled="true"/>
    <hashTree>
      <Arguments guiclass="ArgumentsPanel" testclass="Arguments" testname="environment" enabled="true">
        <collectionProp name="Arguments.arguments">
          <elementProp name="THREADS" elementType="Argument">
            <stringProp name="Argument.name">THREADS</stringProp>
            <stringProp name="Argument.value">400</stringProp>
          </elementProp>
          <elementProp name="TOKEN" elementType="Argument">
            <stringProp name="Argument.name">TOKEN</stringProp>
            <stringProp name="Argument.value">lt_svc_7f3a9c21e5b0</stringProp>
          </elementProp>
        </collectionProp>
      </Arguments>
      <hashTree/>
      <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="auth" enabled="true">
        <collectionProp name="HeaderManager.headers">
          <elementProp name="" elementType="Header">
            <stringProp name="Header.name">Authorization</stringProp>
            <stringProp name="Header.value">Bearer ${TOKEN}</stringProp>
          </elementProp>
        </collectionProp>
      </HeaderManager>
      <hashTree/>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="orders" enabled="true">
        <stringProp name="ThreadGroup.num_threads">${THREADS}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">120</stringProp>
        <stringProp name="ThreadGroup.duration">900</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="POST orders" enabled="true">
          <stringProp name="HTTPSampler.domain">${__P(BASE_HOST,staging.orders.example.com)}</stringProp>
          <stringProp name="HTTPSampler.port">${__P(PORT,443)}</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/v2/orders</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET orders" enabled="true">
          <stringProp name="HTTPSampler.domain">${__P(BASE_HOST,staging.orders.example.com)}</stringProp>
          <stringProp name="HTTPSampler.port">${__P(PORT,443)}</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/v2/orders/${orderId}</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>

=============== FILE: plans/orders-dev.jmx ===============
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="orders-dev" enabled="true"/>
    <hashTree>
      <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="auth" enabled="true">
        <collectionProp name="HeaderManager.headers">
          <elementProp name="" elementType="Header">
            <stringProp name="Header.name">Authorization</stringProp>
            <stringProp name="Header.value">Bearer lt_svc_7f3a9c21e5b0</stringProp>
          </elementProp>
        </collectionProp>
      </HeaderManager>
      <hashTree/>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="orders" enabled="true">
        <stringProp name="ThreadGroup.num_threads">400</stringProp>
        <stringProp name="ThreadGroup.ramp_time">120</stringProp>
        <stringProp name="ThreadGroup.duration">900</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="POST orders" enabled="true">
          <stringProp name="HTTPSampler.domain">dev.orders.example.com</stringProp>
          <stringProp name="HTTPSampler.port">8443</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/v1/orders</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>

=============== FILE: plans/orders-prod.jmx ===============
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="orders-prod" enabled="true"/>
    <hashTree>
      <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="auth" enabled="true">
        <collectionProp name="HeaderManager.headers">
          <elementProp name="" elementType="Header">
            <stringProp name="Header.name">Authorization</stringProp>
            <stringProp name="Header.value">Bearer lt_svc_7f3a9c21e5b0</stringProp>
          </elementProp>
        </collectionProp>
      </HeaderManager>
      <hashTree/>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="orders" enabled="true">
        <stringProp name="ThreadGroup.num_threads">400</stringProp>
        <stringProp name="ThreadGroup.ramp_time">120</stringProp>
        <stringProp name="ThreadGroup.duration">900</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="POST orders" enabled="true">
          <stringProp name="HTTPSampler.domain">orders.example.com</stringProp>
          <stringProp name="HTTPSampler.port">443</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/v2/orders</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>

=============== FILE: .github/workflows/orders-load.yml ===============
name: orders-load

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: |
          docker run --rm -v "$PWD:/work" -w /work apache/jmeter:5.6.3 \
            -n -t plans/orders.jmx -l artifacts/dev.jtl \
            -JBASE_HOST=dev.orders.example.com -JPORT=8443 -JTHREADS=400

  us-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: |
          docker run --rm -v "$PWD:/work" -w /work apache/jmeter:5.6.3 \
            -n -t plans/orders.jmx -l artifacts/us-staging.jtl \
            -JBASE_HOST=staging.orders.example.com -JPORT=443 -JTHREADS=400

  eu-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: |
          docker run --rm -v "$PWD:/work" -w /work apache/jmeter:5.6.3 \
            -n -t plans/orders.jmx -l artifacts/eu-staging.jtl \
            -JBASE_HOST=eu-staging.orders.example.com -JPORT=443 -JTHREADS=80

  prod:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: |
          docker run --rm -v "$PWD:/work" -w /work apache/jmeter:5.6.3 \
            -n -t plans/orders.jmx -l artifacts/prod.jtl \
            -JBASE_HOST=orders.example.com -JPORT=443 -JTHREADS=400

=============== FILE: ci/environments.json ===============
[
  { "name": "dev",        "host": "dev.orders.example.com",        "port": 8443 },
  { "name": "us-staging", "host": "staging.orders.example.com",    "port": 443  },
  { "name": "eu-staging", "host": "eu-staging.orders.example.com", "port": 443  },
  { "name": "prod",       "host": "orders.example.com",            "port": 443  }
]

=============== FILE: scripts/check-envs.mjs ===============
// Guards the load workflow against two things: an environment being added to
// ci/environments.json and then forgotten in the workflow, and the workflow
// overriding a value the plan does not read. Written in August after EU was
// nearly missed.

export function jobNames(yml) {
  const jobs = yml.split(/^jobs:\s*$/m)[1] ?? "";
  return [...jobs.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)].map((m) => m[1]);
}

export function overriddenProperties(yml) {
  return [...new Set([...yml.matchAll(/-J([A-Za-z0-9_.]+)=/g)].map((m) => m[1]))];
}

export function propertiesReadBy(jmx) {
  return [...new Set([...jmx.matchAll(/\$\{(?:__P\()?([A-Za-z0-9_.]+)/g)].map((m) => m[1]))];
}

export function check(yml, environments, jmx) {
  const jobs = jobNames(yml);
  const problems = environments
    .filter((e) => !jobs.includes(e))
    .map((e) => `no job for environment ${e}`);

  const read = propertiesReadBy(jmx);
  for (const p of overriddenProperties(yml)) {
    if (!read.includes(p)) problems.push(`workflow overrides ${p} but the plan never reads it`);
  }
  return problems;
}

=============== FILE: scripts/check-envs.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, jobNames, overriddenProperties, propertiesReadBy } from './check-envs.mjs';

const workflow = readFileSync(
  new URL('../.github/workflows/orders-load.yml', import.meta.url),
  'utf8',
);
const plan = readFileSync(new URL('../plans/orders.jmx', import.meta.url), 'utf8');
const environments = JSON.parse(
  readFileSync(new URL('../ci/environments.json', import.meta.url), 'utf8'),
).map((e) => e.name);

test('every job in the workflow is found', () => {
  assert.deepEqual(jobNames(workflow), ['dev', 'us-staging', 'eu-staging', 'prod']);
});

test('the properties the workflow overrides are listed', () => {
  assert.deepEqual(overriddenProperties(workflow).sort(), ['BASE_HOST', 'PORT', 'THREADS']);
});

test('the plan reads every value the workflow overrides', () => {
  const read = propertiesReadBy(plan);
  for (const p of overriddenProperties(workflow)) {
    assert.ok(read.includes(p), `plan does not read ${p}`);
  }
});

test('an environment with no job is reported', () => {
  const found = check(workflow, [...environments, 'apac-staging'], plan);
  assert.deepEqual(found, ['no job for environment apac-staging']);
});

test('the tree as it stands has nothing to report', () => {
  assert.deepEqual(check(workflow, environments, plan), []);
});

=============== FILE: ops/incident-2026-09-11.md ===============
# INC-2213 — eu-staging unavailable, 2026-09-11 02:02-02:17 UTC

Severity: 2 (non-production, blocked two overnight integration suites)
On-call: @kbriggs

## Timeline

- 02:00 — scheduled load run starts.
- 02:02 — eu-staging API latency climbs past 30 s; health checks start failing.
- 02:06 — @kbriggs paged. Nothing deploying, nothing else scheduled against EU.
- 02:09 — edge metrics show a single source holding roughly 400 concurrent
  request slots open against `eu-staging.orders.example.com`, sustained.
- 02:17 — traffic stops, service recovers on its own within ninety seconds.

## Notes

Sustained concurrency of ~400 for fifteen minutes matches the run duration, and
the source address belongs to the CI egress range. EU is provisioned at roughly a
fifth of US staging and is sized for the 80 the EU job was given when it was set
up on 2026-09-08 — see @rsantos's note of that date, which is unambiguous that
the 400-thread profile must not be pointed at EU.

Nothing in the run reported an error. The job was green on the night of the 11th,
as it has been every night since it was added, and so was the pre-run check.

## Action

Assigned to the load team. Answer required with TICKET-4471.

=============== FILE: docs/TICKET-4471.md ===============
# TICKET-4471 — orders load coverage, and the parameterised plan

Reporter: @dmorel (platform)
Priority: P2, wanted before the APAC build-out starts in January

## Ask 1

Go back to one plan file per environment. The consolidation in August was meant
to stop us copying plans around and instead it took EU staging down on Friday. I
have already written `plans/orders-apac.jmx` for January — the host, the port and
a thread count of 120 written into the file, nothing to pass on the command line,
nothing to forget. Merge that one now and let us do the same for the other four.
Four honest files beat one clever one, and after Friday night I do not think the
clever one is safe.

## Ask 2

While we are in there, make the plan default to production. Right now you cannot
just run the plan, you have to know which arguments to pass. If it defaulted to
the real system, anyone could run it with no arguments and get a number that
means something, and the CI jobs would carry on passing their overrides for the
lower environments the way they do today. It would save a lot of "what do I
type" questions from people outside the team.

## Ask 3

Delete `plans/orders-dev.jmx` and `plans/orders-prod.jmx`. Neither has been run
since 12 August. @lpereira wanted them kept "until we are sure" and it has been a
month. I say they go.

## Ask 4

Put the per-environment thread count into `ci/environments.json` next to the host
and the port, and have the workflow take it from there. Right now the number is
retyped into four docker commands and there is nothing anywhere that says what it
is supposed to be for a given environment. If that had been in the file on
8 September somebody reviewing the EU job would have had something to compare
against.

## Note from @rsantos (SRE), 2026-09-08

EU staging is provisioned at roughly a fifth of US staging. Do not point the
standard 400-thread profile at it.
