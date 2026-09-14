import { GraphQLError } from 'graphql';

export const typeDefs = `#graphql
  type Order {
    id: ID!
    total: Int!
    status: String!
    customerId: ID!
  }

  type Viewer {
    id: ID!
    email: String!
    orders(first: Int!): [Order!]!
  }

  type Query {
    viewer: Viewer
    order(id: ID!): Order
    shipmentStatus(orderId: ID!): String
    health: String!
  }
`;

function requireUser(ctx) {
  if (!ctx.user) {
    throw new GraphQLError('Sign in first', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

export const resolvers = {
  Query: {
    health: () => 'ok',

    viewer: (_parent, _args, ctx) => {
      requireUser(ctx);
      return { id: ctx.user.id, email: ctx.user.email };
    },

    order: async (_parent, { id }, ctx) => {
      requireUser(ctx);
      const order = await ctx.dataSources.orders.byId(id);
      if (!order) return null;
      if (order.customerId !== ctx.user.id) {
        throw new GraphQLError('That order belongs to another customer', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return order;
    },

    shipmentStatus: async (_parent, { orderId }, ctx) => {
      requireUser(ctx);
      const order = await ctx.dataSources.orders.byId(orderId);
      return order?.status ?? null;
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
};
