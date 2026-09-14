const ORDERS = [
  { id: 'o_1001', customerId: 'u_8812', total: 4200, status: 'in_transit' },
  { id: 'o_1002', customerId: 'u_8812', total: 1150, status: 'delivered' },
  { id: 'o_1003', customerId: 'u_8812', total: 9900, status: 'delivered' },
  { id: 'o_2001', customerId: 'u_4410', total: 700, status: 'in_transit' },
];

export const ordersRepo = {
  byId: async (id) => ORDERS.find((o) => o.id === id) ?? null,
  forCustomer: async (customerId, first) =>
    ORDERS.filter((o) => o.customerId === customerId).slice(0, first),
};
