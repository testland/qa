import { readFile } from 'node:fs/promises';
import { parseWaivers, applyWaivers, verdict } from './gate.js';

const findings = JSON.parse(await readFile('data/sca-findings.json', 'utf8'));
const waivers = parseWaivers(await readFile('.sca-waivers.yaml', 'utf8'));
const surviving = applyWaivers(findings, waivers);
const result = verdict(surviving, 'critical');

console.log(`waivers loaded: ${waivers.length}, findings suppressed: ${findings.length - surviving.length}`);
console.log(`findings: ${findings.length} in, ${surviving.length} after waivers`);
console.log(`verdict: ${result.verdict}`);
process.exit(result.verdict === 'BLOCK' ? 1 : 0);
