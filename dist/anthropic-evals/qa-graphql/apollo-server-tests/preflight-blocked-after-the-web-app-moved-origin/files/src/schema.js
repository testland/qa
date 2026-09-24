export const typeDefs = `#graphql
  type Shipment {
    id: ID!
    status: String!
  }

  type Query {
    health: String!
    shipment(id: ID!): Shipment
  }
`;

export const resolvers = {
  Query: {
    health: () => 'ok',
    shipment: (_parent, { id }) => ({ id, status: 'in_transit' }),
  },
};
