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
