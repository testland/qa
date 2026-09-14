'use strict';

const contacts = [];
const deletionRequests = [];

function seed() {
  contacts.length = 0;
  deletionRequests.length = 0;
  contacts.push(
    { crmId: 'c_51', email: 'nina.abel@example.net', fullName: 'N. Abel', lifecycle: 'customer' },
    { crmId: 'c_52', email: 'omar.kade@example.net', fullName: 'O. Kade', lifecycle: 'customer' },
  );
}

function upsert(contact) {
  contacts.push({ crmId: `c_${contacts.length + 60}`, ...contact });
}

function contactsFor(email) {
  return contacts.filter((c) => c.email === email);
}

function requestDeletion(email, at) {
  for (let i = contacts.length - 1; i >= 0; i -= 1) {
    if (contacts[i].email === email) contacts.splice(i, 1);
  }
  deletionRequests.push({ email, requestedAt: at });
}

function deletionRequestsFor(email) {
  return deletionRequests.filter((d) => d.email === email);
}

seed();

module.exports = { seed, upsert, contactsFor, requestDeletion, deletionRequestsFor };
