'use strict';

const fs = require('node:fs');

// A committed context file may reference a credential but never carry one.
const REFERENCE = /^(\$\{[A-Z0-9_]+\}|%[A-Z0-9_]+%)$/;

function lint(xml) {
  const problems = [];
  if (!/<name>[^<]+<\/name>/.test(xml)) problems.push('context has no name');
  for (const match of xml.matchAll(/<(username|password)>([\s\S]*?)<\/\1>/g)) {
    const field = match[1];
    const value = match[2].trim();
    if (value && !REFERENCE.test(value)) {
      problems.push('literal ' + field + ' committed in the context file');
    }
  }
  return problems;
}

if (require.main === module) {
  const file = process.argv[2] || '.zap/context.xml';
  const problems = lint(fs.readFileSync(file, 'utf8'));
  for (const p of problems) console.log(p);
  console.log(problems.length + ' problem(s) in ' + file);
  process.exit(problems.length ? 1 : 0);
}

module.exports = { lint };
