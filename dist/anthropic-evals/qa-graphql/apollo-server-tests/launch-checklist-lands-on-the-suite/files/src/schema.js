import { GraphQLError } from 'graphql';

export const typeDefs = `#graphql
  type Order {
    id: ID!
    total: Int!
    status: String!
    trackingCode: String
    customerId: ID!
  }

  type Viewer {
    id: ID!
    customerEmail: String!
    orders(first: Int!): [Order!]!
  }

  type Query {
    viewer: Viewer
    health: String!
  }

  type Subscription {
    orderUpdated(orderId: ID!): Order!
  }
`;

export const resolvers = {
  Query: {
    health: () => 'ok',
    viewer: (_parent, _args, ctx) => {
      if (!ctx.user) {
        throw new GraphQLError('Sign in first', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return { id: ctx.user.id, customerEmail: ctx.user.email };
    },
  },

  Viewer: {
    orders: async (parent, { first }, ctx) => {
      if (first < 1 || first > 50) {
        throw new GraphQLError('first must be between 1 and 50', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      return ctx.dataSources.orders.forCustomer(parent.id, first);
    },
  },

  Subscription: {
    orderUpdated: {
      subscribe: (_parent, { orderId }, ctx) =>
        ctx.pubsub.asyncIterator([`ORDER_UPDATED:${orderId}`]),
    },
  },
};
