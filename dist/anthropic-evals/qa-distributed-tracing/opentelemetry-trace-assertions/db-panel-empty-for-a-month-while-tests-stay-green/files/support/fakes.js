'use strict';

const fakeGateway = () => ({
  async charge(amountCents, currency) {
    return { status: 'captured', chargeId: 'ch_5512', amountCents, currency };
  },
});

const fakeDb = () => {
  let n = 0;
  return {
    async insert(table, row) {
      n += 1;
      return Object.assign({ id: `${table.slice(0, 3)}_${1000 + n}` }, row);
    },
  };
};

const sampleCart = () => ({
  currency: 'EUR',
  items: [
    { sku: 'kb-01', cents: 4900 },
    { sku: 'ms-02', cents: 2900 },
  ],
});

module.exports = { fakeGateway, fakeDb, sampleCart };
