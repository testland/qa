import { readFileSync } from 'node:fs';

export function configPath(projectRoot) {
  return projectRoot + '/config/app.json';
}

export function cachePath(projectRoot) {
  return projectRoot + '/.acme-sync/cache';
}

export function readConfig(projectRoot) {
  return JSON.parse(readFileSync(configPath(projectRoot), 'utf8'));
}
