# Four copies of the orders plan, a fifth on the way, and a parameterised one nobody trusts

## Problem Description

Until August we had three files under `plans/` that were the same six samplers
three times over, differing in the host they point at, the port, and a service
token pasted into a header. In August @lpereira consolidated them into one
parameterised `plans/orders.jmx` and wired the workflow to pass the
environment-specific values in on the command line. The old files are still
sitting in the repo; nobody got round to deleting them.

EU staging went live on 2026-09-08 and got a job the same day against the
consolidated plan. It has been green every night since.

TICKET-4471 landed on Wednesday and I owe @dmorel an answer by Friday. It has
four asks. Two of them I think are wrong and I cannot articulate why, one I think
is right and my team will hate, and one I genuinely do not have a view on.

Things that are worth knowing before you read it:

- In July, before the consolidation, the orders endpoint moved from `/v1/orders`
  to `/v2/orders`. Two of the three files got updated. The dev one did not, and
  because the service still answers the old path through a deprecation shim,
  nothing failed, nothing errored, and for six weeks the dev run was exercising
  an endpoint that is not the one we ship. We found it by accident.
- The service token rotates every 90 days. The next rotation is 2026-10-01.
- EU staging is provisioned at roughly a fifth of US staging. Our SRE has put in
  writing that the 400-thread profile must not be pointed at it.
- I have attached last night's EU results file, trimmed to the first few rows.
  @dmorel pulled it himself while writing the ticket and told me it looks fine.

Give me a straight answer on each of the four asks. If one of them is fine as
written, say so.

## Output Specification

1. Leave `plans/` in whatever state you think it should be in for the four
   environments we have and the two that are coming.
2. Update `.github/workflows/orders-load.yml` to match.
3. Extend `scripts/check-envs.mjs` with whatever check you think it is missing,
   and cover it in `scripts/check-envs.test.mjs`. `node --test` must pass against
   what you deliver.
4. Write `docs/orders-load.md`: how to run against each environment, where every
   environment-specific value comes from, what happens if somebody runs it with
   one of them missing, and one short section per ask in TICKET-4471 with a plain
   yes or no on each.

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
          <elementProp name="BASE_HOST" elementType="Argument">
            <stringProp name="Argument.name">BASE_HOST</stringProp>
            <stringProp name="Argument.value">staging.orders.example.com</stringProp>
          </elementProp>
          <elementProp name="PORT" elementType="Argument">
            <stringProp name="Argument.name">PORT</stringProp>
            <stringProp name="Argument.value">443</stringProp>
          </elementProp>
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
          <stringProp name="HTTPSampler.domain">${BASE_HOST}</stringProp>
          <stringProp name="HTTPSampler.port">${PORT}</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/v2/orders</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET orders" enabled="true">
          <stringProp name="HTTPSampler.domain">${BASE_HOST}</stringProp>
          <stringProp name="HTTPSampler.port">${PORT}</stringProp>
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
// Guards the load workflow against an environment being added to ci/environments.json
// and then forgotten in the workflow. Written in August after EU was nearly missed.

export function jobNames(yml) {
  const jobs = yml.split(/^jobs:\s*$/m)[1] ?? "";
  return [...jobs.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)].map((m) => m[1]);
}

export function overriddenProperties(yml) {
  return [...new Set([...yml.matchAll(/-J([A-Za-z0-9_.]+)=/g)].map((m) => m[1]))];
}

export function check(yml, environments) {
  const jobs = jobNames(yml);
  return environments
    .filter((e) => !jobs.includes(e))
    .map((e) => `no job for environment ${e}`);
}

=============== FILE: scripts/check-envs.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, jobNames, overriddenProperties } from './check-envs.mjs';

const workflow = readFileSync(
  new URL('../.github/workflows/orders-load.yml', import.meta.url),
  'utf8',
);
const environments = JSON.parse(
  readFileSync(new URL('../ci/environments.json', import.meta.url), 'utf8'),
).map((e) => e.name);

test('every job in the workflow is found', () => {
  assert.deepEqual(jobNames(workflow), ['dev', 'us-staging', 'eu-staging', 'prod']);
});

test('every declared environment has a job', () => {
  assert.deepEqual(check(workflow, environments), []);
});

test('an environment with no job is reported', () => {
  const found = check(workflow, [...environments, 'apac-staging']);
  assert.deepEqual(found, ['no job for environment apac-staging']);
});

test('the properties the workflow overrides are listed', () => {
  assert.deepEqual(overriddenProperties(workflow).sort(), ['BASE_HOST', 'PORT', 'THREADS']);
});

=============== FILE: artifacts/eu-staging-2026-09-11.jtl ===============
timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect
1757548803412,214,POST orders,201,Created,orders 1-118,text,true,,842,506,400,400,https://staging.orders.example.com/v2/orders,206,0,14
1757548803629,198,GET orders,200,OK,orders 1-204,text,true,,1204,402,400,400,https://staging.orders.example.com/v2/orders/ord_40118,190,0,12
1757548803884,221,POST orders,201,Created,orders 1-311,text,true,,840,506,400,400,https://staging.orders.example.com/v2/orders,212,0,13
1757548804102,207,GET orders,200,OK,orders 1-77,text,true,,1198,402,400,400,https://staging.orders.example.com/v2/orders/ord_40077,199,0,12
1757548804330,233,POST orders,201,Created,orders 1-392,text,true,,841,506,400,400,https://staging.orders.example.com/v2/orders,224,0,15
1757548804561,201,GET orders,200,OK,orders 1-12,text,true,,1201,402,400,400,https://staging.orders.example.com/v2/orders/ord_40012,194,0,11
1757548804790,218,POST orders,201,Created,orders 1-255,text,true,,843,506,400,400,https://staging.orders.example.com/v2/orders,210,0,14
1757548805014,204,GET orders,200,OK,orders 1-340,text,true,,1199,402,400,400,https://staging.orders.example.com/v2/orders/ord_40340,197,0,12

=============== FILE: docs/TICKET-4471.md ===============
# TICKET-4471 — orders load coverage, and the parameterised plan

Reporter: @dmorel (platform)
Priority: P2, wanted before the APAC build-out starts in January

## Ask 1

Go back to one file per environment. The consolidation in August was meant to
stop us copying plans around, and instead we have `plans/orders.jmx` plus the
originals nobody deleted, plus EU on top. And the parameterised plan does not
appear to be doing anything: EU's numbers came back indistinguishable from US
staging on the first night and every night since — same throughput, same p95,
same error rate — on an environment that is a fifth of the size. I would rather
have four honest files than one clever one nobody can read. One file per
environment, and the same for APAC in January.

## Ask 2

While we are in there, make the plan default to production. Right now you cannot
just run the plan, you have to know which arguments to pass. If it defaulted to
the real system, anyone could run it with no arguments and get a number that
means something, and the CI jobs would carry on passing their overrides for the
lower environments the way they do today. It would save a lot of "what do I
type" questions from people outside the team.

## Ask 3

Retire the US staging nightly. EU has been green since the day it was added, it
costs the same runner minutes, and we are paying for two nightly runs of the same
six samplers. Keep EU, drop US staging, and put the minutes into the APAC job
when it lands.

## Ask 4

Delete `plans/orders-dev.jmx` and `plans/orders-prod.jmx`. Neither has been run
since 12 August. @lpereira wanted them kept "until we are sure" and it has been a
month. I say they go.

## Note from @rsantos (SRE), 2026-09-08

EU staging is provisioned at roughly a fifth of US staging. Do not point the
standard 400-thread profile at it.
