const BASE = process.env.BILLING_BASE ?? 'https://billing.internal.northwind';

export const billingClient = {
  accountFor: async (customerId) => {
    const res = await fetch(`${BASE}/v2/accounts/${customerId}`, {
      headers: { authorization: `Bearer ${process.env.BILLING_KEY}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.account ?? null;
  },
};
