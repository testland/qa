import fs from 'node:fs';
import path from 'node:path';

const envFile = path.join(process.cwd(), '.staging.env');
const fileEnv = Object.fromEntries(
  fs
    .readFileSync(envFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('=')),
);

export const BASE = process.env.API_BASE_URL ?? fileEnv.API_BASE_URL;
export const TOKEN = process.env.API_TOKEN ?? fileEnv.API_TOKEN;
export const RUN_LABEL = `${process.env.GITHUB_RUN_ID ?? 'local'}-${Date.now()}`;

export function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${TOKEN}`, 'X-Run-Label': RUN_LABEL, ...extra };
}
