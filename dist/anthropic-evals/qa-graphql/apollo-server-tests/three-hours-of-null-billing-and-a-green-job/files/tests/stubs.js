export const userStub = { id: 'u_8812', email: 'dana@northwind.test' };

export const billingStub = {
  accountFor: async (userId) => ({
    id: `ba_${userId}`,
    plan: 'growth',
    seats: 12,
    renewsOn: '2026-09-01',
  }),
};
