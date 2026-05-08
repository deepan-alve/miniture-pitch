import { ReactNode } from 'react';
import { NhostProvider } from '@nhost/react';
import { ApolloProvider } from '@apollo/client';

import { nhost } from '@/lib/nhost';
import { apolloClient } from '@/lib/apollo';

// Composed provider tree. Wrap once at the root layout.
//   Nhost   → owns auth session + token refresh
//   Apollo  → talks to Hasura with the current token

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NhostProvider nhost={nhost}>
      <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
    </NhostProvider>
  );
}
