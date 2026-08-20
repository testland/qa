'use strict';

function createBillingRepository(seed) {
  const invoices = seed.map((invoice) => ({ ...invoice }));

  function scoped(session) {
    if (session.crossTenant) {
      return invoices;
    }
    return invoices.filter((invoice) => invoice.tenantId === session.tenantId);
  }

  return {
    listInvoices(session) {
      return scoped(session);
    },
    getInvoice(session, id) {
      return scoped(session).find((invoice) => invoice.id === id) || null;
    },
    voidInvoice(session, id) {
      const invoice = scoped(session).find((item) => item.id === id);
      if (!invoice) {
        return { status: 'not_found' };
      }
      invoice.voided = true;
      return { status: 'ok' };
    },
    rawAll() {
      return invoices;
    },
  };
}

module.exports = { createBillingRepository };
