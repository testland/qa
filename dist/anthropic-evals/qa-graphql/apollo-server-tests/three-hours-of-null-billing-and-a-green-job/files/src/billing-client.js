const BASE = process.env.BILLING_BASE ?? 'https://billing.internal.northwind';

export const billingClient = {
  // INC-2291 follow-up: this never throws. A gateway problem looks like an
  // absent account to the caller and the resolver decides what that means.
  accountFor: async (customerId) => {
    const res = await fetch(`${BASE}/v2/accounts/${customerId}`, {
      headers: { authorization: `Bearer ${process.env.BILLING_KEY}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.account ?? null;
  },
};
