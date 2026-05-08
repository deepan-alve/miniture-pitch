// Factory that selects the connector implementation based on env.
//
// THE swap. To go from demo to production, set CONNECTOR_MODE=production
// and provide SHOPIFY_SHOP_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN. Nothing
// else in the codebase needs to change.

import type { ShopifyConnector } from './ShopifyConnector';
import { ShopifyStub } from './ShopifyStub';
import { ShopifyClient } from './ShopifyClient';

export type { ShopifyConnector } from './ShopifyConnector';
export type * from './types';

interface HasuraClient {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

/**
 * Minimal Hasura admin GraphQL client. Used by the stub (and any other
 * Function that needs to read/write Hasura outside of the user's JWT).
 */
export function createHasuraClient(opts: {
  endpoint: string; // e.g. https://<subdomain>.hasura.<region>.nhost.run/v1/graphql
  adminSecret: string;
}): HasuraClient {
  return {
    async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
      const res = await fetch(opts.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': opts.adminSecret,
        },
        body: JSON.stringify({ query, variables }),
      });
      if (!res.ok) {
        throw new Error(`Hasura ${res.status}: ${await res.text()}`);
      }
      const json = (await res.json()) as { data?: T; errors?: unknown };
      if (json.errors) throw new Error(`Hasura errors: ${JSON.stringify(json.errors)}`);
      return json.data as T;
    },
  };
}

export function getShopifyConnector(): ShopifyConnector {
  const mode = process.env.CONNECTOR_MODE ?? 'stub';

  if (mode === 'production') {
    const shop = process.env.SHOPIFY_SHOP_DOMAIN;
    const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    const collection = process.env.SHOPIFY_RENEWED_COLLECTION_GID;
    if (!shop || !token || !collection) {
      throw new Error(
        'CONNECTOR_MODE=production requires SHOPIFY_SHOP_DOMAIN, ' +
          'SHOPIFY_ADMIN_ACCESS_TOKEN, and SHOPIFY_RENEWED_COLLECTION_GID',
      );
    }
    return new ShopifyClient(shop, token, collection);
  }

  // Demo / development.
  const hasuraEndpoint = process.env.NHOST_HASURA_URL ?? process.env.HASURA_GRAPHQL_URL;
  const hasuraAdminSecret =
    process.env.NHOST_HASURA_ADMIN_SECRET ?? process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!hasuraEndpoint || !hasuraAdminSecret) {
    throw new Error(
      'Stub connector requires NHOST_HASURA_URL and NHOST_HASURA_ADMIN_SECRET (or HASURA_* equivalents)',
    );
  }
  return new ShopifyStub(
    createHasuraClient({ endpoint: hasuraEndpoint, adminSecret: hasuraAdminSecret }),
  );
}
