const fs = require('node:fs');
const path = require('node:path');
const { pseudoLocalize } = require('../src/pseudo');

const LOCALES = path.join(__dirname, '..', 'locales');
const SOURCE = path.join(LOCALES, 'en.json');

function parseArgs(argv) {
  const args = new Map();
  for (const arg of argv) {
    const [key, value] = arg.split('=');
    args.set(key.replace(/^--/, ''), value);
  }
  return args;
}

function build(argv) {
  const args = parseArgs(argv);
  const code = args.get('locale') || 'en';
  const out = args.get('out') || path.join(LOCALES, code + '.json');
  const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const built = {};
  for (const [key, value] of Object.entries(source)) built[key] = pseudoLocalize(value);
  fs.writeFileSync(out, JSON.stringify(built, null, 2) + '\n');
  return out;
}

if (require.main === module) console.log('built', build(process.argv.slice(2)));

module.exports = { build, parseArgs };
