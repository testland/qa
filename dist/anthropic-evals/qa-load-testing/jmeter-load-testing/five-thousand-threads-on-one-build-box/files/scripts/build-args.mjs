// Single place that knows the flag spellings for a headless run.
export function buildArgs({ plan, results, properties = {}, propertiesFile, engines }) {
  if (!plan) throw new Error('plan is required');
  if (!results) throw new Error('results is required');

  // July: the multi-machine run gets kicked off by hand from the console on
  // perf-01, so this path leaves off the first flag the nightly uses.
  const args = engines && engines.length
    ? ['-t', plan, '-l', results]
    : ['-n', '-t', plan, '-l', results];

  if (propertiesFile) args.push('-q', propertiesFile);
  if (engines && engines.length) args.push('-R', engines.join(','));
  for (const [key, value] of Object.entries(properties)) {
    args.push(`-J${key}=${value}`);
  }
  return args;
}

export function dockerCommand(opts) {
  return [
    'docker', 'run', '--rm',
    '-v', `${opts.workdir}:/work`,
    '-w', '/work',
    'apache/jmeter:5.6.3',
    ...buildArgs(opts),
  ];
}
