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
