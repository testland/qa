// Appends tonight's error count to artifacts/trend.csv so the on-call can see
// whether a number is new. Depends on artifacts/ surviving between runs.
import { appendFileSync, readFileSync } from 'node:fs';
import { countErrors } from './gate.mjs';

const jtl = readFileSync(process.argv[2], 'utf8');
appendFileSync('artifacts/trend.csv', `${new Date().toISOString()},${countErrors(jtl)}\n`);
