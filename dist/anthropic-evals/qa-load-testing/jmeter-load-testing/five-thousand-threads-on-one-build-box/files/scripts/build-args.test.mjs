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
