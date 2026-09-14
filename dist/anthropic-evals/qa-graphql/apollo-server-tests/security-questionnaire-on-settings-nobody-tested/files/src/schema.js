export const typeDefs = `#graphql
  enum ShipmentState {
    IN_TRANSIT
    DELIVERED
    RETURNED
  }

  type Customer {
    id: ID!
    customerEmail: String!
    shipmentCount: Int!
  }

  type Query {
    customer(id: ID!, includeArchived: Boolean): Customer
    shipments(state: ShipmentState!): [String!]!
    health: String!
  }
`;

const CUSTOMERS = {
  c_1: { id: 'c_1', customerEmail: 'ops@meridian.test', shipmentCount: 418 },
};

const SHIPMENTS = {
  IN_TRANSIT: ['s_9001'],
  DELIVERED: ['s_8817', 's_8820'],
  RETURNED: [],
};

export const resolvers = {
  Query: {
    customer: (_parent, { id }) => CUSTOMERS[id] ?? null,
    shipments: (_parent, { state }) => SHIPMENTS[state] ?? [],
    health: () => 'ok',
  },
};
