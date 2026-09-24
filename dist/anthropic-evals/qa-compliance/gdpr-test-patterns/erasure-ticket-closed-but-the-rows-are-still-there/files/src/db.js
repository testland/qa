'use strict';

const db = {
  users: [],
  billingRecords: [],
  supportTickets: [],
};

function seed() {
  db.users = [
    { id: 'u_401', email: 'nina.abel@example.net', displayName: 'N. Abel', country: 'FR', status: 'active' },
    { id: 'u_402', email: 'omar.kade@example.net', displayName: 'O. Kade', country: 'DE', status: 'active' },
  ];
  db.billingRecords = [
    { id: 'inv_9001', userEmail: 'nina.abel@example.net', amountCents: 4900 },
    { id: 'inv_9002', userEmail: 'omar.kade@example.net', amountCents: 4900 },
  ];
  db.supportTickets = [
    { id: 't_77', requesterEmail: 'nina.abel@example.net', body: 'Export is stuck' },
    { id: 't_78', requesterEmail: 'omar.kade@example.net', body: 'Invoice question' },
  ];
}

function userByEmail(email) {
  return db.users.find((u) => u.email === email) || null;
}

seed();

module.exports = { db, seed, userByEmail };
