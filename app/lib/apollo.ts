// Apollo Client wired to cloud Hasura. The auth header is filled per-request
// from the Nhost session, so it stays fresh after token refresh.

import { ApolloClient, HttpLink, InMemoryCache, split, from } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

import { HASURA_GRAPHQL_HTTP, HASURA_GRAPHQL_WS } from './env';
import { nhost } from './nhost';

const httpLink = new HttpLink({ uri: HASURA_GRAPHQL_HTTP });

const authLink = setContext(async (_, { headers }) => {
  const token = nhost.auth.getAccessToken();
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: HASURA_GRAPHQL_WS,
    connectionParams: () => {
      const token = nhost.auth.getAccessToken();
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    },
  }),
);

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  from([authLink, httpLink]),
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
