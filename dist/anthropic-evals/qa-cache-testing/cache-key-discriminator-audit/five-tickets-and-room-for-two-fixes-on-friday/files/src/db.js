'use strict';

const orgs = {
  acme: { plan: 'business', seatsUsed: 214, seatLimit: 250, trialEndsAt: '2026-09-25T00:00:00Z' },
  globex: { plan: 'free', seatsUsed: 8, seatLimit: 10, trialEndsAt: '2026-09-25T00:00:00Z' },
};

const invoiceRows = {
  'acme:2026-08': [{ cents: 41800 }, { cents: 12500 }],
  'globex:2026-08': [{ cents: 9900 }],
};

let members = [
  { tenantId: 'acme', memberNo: 1, name: 'Priya Raman', displayCurrency: 'GBP', locale: 'en-GB', role: 'admin' },
  { tenantId: 'acme', memberNo: 2, name: 'Ana Costa', displayCurrency: 'EUR', locale: 'en-GB', role: 'member' },
  { tenantId: 'globex', memberNo: 1, name: 'Hana Okafor', displayCurrency: 'USD', locale: 'en-GB', role: 'admin' },
];

module.exports = {
  org: (tenantId) => ({ ...orgs[tenantId] }),
  setSeatLimit: (tenantId, limit) => {
    orgs[tenantId].seatLimit = limit;
  },
  invoiceRows: (tenantId, period) => [...(invoiceRows[`${tenantId}:${period}`] ?? [])],
  members: (tenantId) => members.filter((m) => m.tenantId === tenantId),
  removeMember: (tenantId, memberNo) => {
    members = members.filter((m) => !(m.tenantId === tenantId && m.memberNo === memberNo));
  },
  sessionFor: (tenantId, memberNo) => {
    const m = members.find((x) => x.tenantId === tenantId && x.memberNo === memberNo);
    return {
      tenantId: m.tenantId,
      memberNo: m.memberNo,
      displayCurrency: m.displayCurrency,
      locale: m.locale,
      role: m.role,
    };
  },
};
