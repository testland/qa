import { GraphQLError } from 'graphql';

export function depthLimit(max) {
  return (context) => ({
    Field(node, _key, _parent, _path, ancestors) {
      const depth = ancestors.filter((a) => a && a.kind === 'SelectionSet').length;
      if (depth > max) {
        context.reportError(
          new GraphQLError(`Query is nested deeper than ${max} levels`, { nodes: [node] }),
        );
      }
    },
  });
}
