import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'test-results';
let tests = 0;
let failures = 0;

for (const name of readdirSync(dir).filter((f) => f.endsWith('.xml'))) {
  const xml = readFileSync(join(dir, name), 'utf8');
  tests += (xml.match(/<testcase/g) ?? []).length;
  failures += (xml.match(/<failure/g) ?? []).length;
}

console.log(`${tests} tests, ${failures} failures`);
if (failures > 0) process.exitCode = 1;
