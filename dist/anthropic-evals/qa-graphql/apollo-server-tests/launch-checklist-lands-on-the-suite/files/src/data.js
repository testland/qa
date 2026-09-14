const ORDERS = [
  { id: 'o_1001', customerId: 'u_8812', total: 4200, status: 'in_transit', trackingCode: 'PZ4410' },
  { id: 'o_1002', customerId: 'u_8812', total: 1150, status: 'delivered', trackingCode: 'PZ4411' },
  { id: 'o_2001', customerId: 'u_4410', total: 700, status: 'in_transit', trackingCode: null },
];

export const ordersRepo = {
  byId: async (id) => ORDERS.find((o) => o.id === id) ?? null,
  forCustomer: async (customerId, first) =>
    ORDERS.filter((o) => o.customerId === customerId).slice(0, first),
};
