import { registerContact } from '../src/validation.js';
import { makeContact } from '../tests/factories/contact.js';

const store = [];
const count = Number(process.argv[2] ?? 100);

for (let i = 0; i < count; i += 1) {
  registerContact(store, makeContact());
}

console.log(`seeded ${store.length} contacts`);
