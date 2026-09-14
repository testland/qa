import { GraphQLError } from 'graphql';

export const typeDefs = `#graphql
  type BillingAccount {
    id: ID!
    plan: String!
    seats: Int!
    renewsOn: String!
  }

  type Viewer {
    id: ID!
    email: String!
    billingAccount: BillingAccount!
  }

  type Query {
    viewer: Viewer
  }
`;

export const resolvers = {
  Query: {
    viewer: (_parent, _args, ctx) => {
      if (!ctx.user) {
        throw new GraphQLError('Sign in to view billing', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return { id: ctx.user.id, email: ctx.user.email };
    },
  },

  Viewer: {
    // Deliberate: no fallback plan. See INC-2291 (April double-charge) - we
    // billed 61 customers against a plan we had cached and they had left.
    billingAccount: async (parent, _args, ctx) => {
      const account = await ctx.dataSources.billing.accountFor(parent.id);
      if (!account) {
        throw new GraphQLError('Billing gateway unavailable', {
          extensions: { code: 'BILLING_UNAVAILABLE' },
        });
      }
      return account;
    },
  },
};
