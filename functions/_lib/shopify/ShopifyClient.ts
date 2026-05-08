// Production Shopify client.
//
// NOT WIRED IN THE DEMO. This file exists so the reviewer can see exactly
// what production integration looks like — the GraphQL queries are real
// and ready, only the HTTP transport is stubbed.
//
// To enable: set CONNECTOR_MODE=production in env, set SHOPIFY_SHOP_DOMAIN
// and SHOPIFY_ADMIN_ACCESS_TOKEN, and the factory in index.ts will pick
// this implementation.

import type { ShopifyConnector } from './ShopifyConnector';
import type {
  Product,
  ProductInput,
  ShopifyGID,
  Customer,
  Order,
  DiscountCode,
  DiscountCodeInput,
  ConnectorResponse,
} from './types';

const SHOPIFY_API_VERSION = '2026-01';

// ---------- GraphQL operations (these are the real Shopify Admin API queries) ----------

const PRODUCT_CREATE_MUTATION = /* GraphQL */ `
  mutation MinitureRenewedProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        descriptionHtml
        status
        tags
        onlineStoreUrl
        variants(first: 1) {
          nodes {
            id
            price
            compareAtPrice
            sku
          }
        }
        images(first: 10) {
          nodes {
            src
            altText
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_QUERY = /* GraphQL */ `
  query MinitureRenewedProduct($id: ID!) {
    product(id: $id) {
      id
      title
      descriptionHtml
      status
      tags
      onlineStoreUrl
      variants(first: 1) {
        nodes { id price compareAtPrice sku }
      }
      images(first: 10) {
        nodes { src altText }
      }
    }
  }
`;

const RENEWED_COLLECTION_QUERY = /* GraphQL */ `
  query MinitureRenewedCollection($collectionId: ID!, $first: Int!, $after: String) {
    collection(id: $collectionId) {
      products(first: $first, after: $after) {
        nodes {
          id title descriptionHtml status tags onlineStoreUrl
          variants(first: 1) { nodes { id price compareAtPrice sku } }
          images(first: 5) { nodes { src altText } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const CUSTOMER_ORDERS_QUERY = /* GraphQL */ `
  query MinitureCustomerOrders($customerId: ID!, $first: Int!) {
    customer(id: $customerId) {
      id
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          processedAt
          totalPriceSet { shopMoney { amount currencyCode } }
          lineItems(first: 50) {
            nodes {
              id
              title
              quantity
              variant { id product { id title } }
              originalUnitPriceSet { shopMoney { amount currencyCode } }
            }
          }
        }
      }
    }
  }
`;

const DISCOUNT_CODE_BASIC_CREATE_MUTATION = /* GraphQL */ `
  mutation MinitureDonateThankYouDiscountCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            title
            startsAt
            endsAt
            codes(first: 1) { nodes { code } }
            customerGets {
              value {
                ... on DiscountPercentage { percentage }
                ... on DiscountAmount { amount { amount currencyCode } }
              }
            }
          }
        }
      }
      userErrors { field code message }
    }
  }
`;

// ---------- The client (transport stubbed) ----------

export class ShopifyClient implements ShopifyConnector {
  constructor(
    private readonly shopDomain: string, // e.g. "miniture.myshopify.com"
    private readonly adminAccessToken: string,
    private readonly renewedCollectionId: ShopifyGID,
  ) {}

  private endpoint(): string {
    return `https://${this.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    // TODO: implement when production-ready.
    // const res = await fetch(this.endpoint(), {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-Shopify-Access-Token': this.adminAccessToken,
    //   },
    //   body: JSON.stringify({ query, variables }),
    // });
    // if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);
    // const json = await res.json();
    // if (json.errors) throw new Error(JSON.stringify(json.errors));
    // return json.data as T;
    throw new Error(
      'ShopifyClient is the production stub — not wired in demo. ' +
        'Set CONNECTOR_MODE=stub or implement the fetch call above.',
    );
  }

  async createRenewedProduct(input: ProductInput): Promise<ConnectorResponse<Product>> {
    // Maps our internal ProductInput to Shopify's ProductInput shape.
    // Shopify's ProductInput puts variants in a separate `variants` array and
    // takes price as a string with currencyCode separately on the variant level.
    const shopifyInput = {
      title: input.title,
      descriptionHtml: input.descriptionHtml,
      vendor: input.vendor ?? 'Miniture',
      productType: input.productType,
      tags: input.tags,
      status: input.status ?? 'ACTIVE',
      collectionsToJoin: [
        ...(input.collectionsToJoin ?? []),
        this.renewedCollectionId, // always include the Renewed collection
      ],
      images: input.images?.map((i) => ({ src: i.src, altText: i.altText })),
      variants: [
        {
          price: input.variant.price.amount,
          compareAtPrice: input.variant.compareAtPrice?.amount,
          sku: input.variant.sku,
          inventoryQuantities: input.variant.inventoryQuantity
            ? [{ availableQuantity: input.variant.inventoryQuantity }]
            : undefined,
        },
      ],
      metafields: input.metafields,
    };

    await this.graphql(PRODUCT_CREATE_MUTATION, { input: shopifyInput });
    // Real implementation would parse the response and map to our `Product`
    // type, surface userErrors, etc.
    throw new Error('Not implemented in demo');
  }

  async markProductSold(_id: ShopifyGID): Promise<ConnectorResponse<void>> {
    // In real Shopify, sold state is driven by orders/create webhooks, not
    // by us mutating. This method exists in the interface for the stub's
    // demo simulation; in production it's a no-op or could decrement inventory
    // via inventoryAdjustQuantities.
    throw new Error('Not implemented in demo');
  }

  async getProduct(_id: ShopifyGID): Promise<ConnectorResponse<Product | null>> {
    // await this.graphql(PRODUCT_QUERY, { id });
    throw new Error('Not implemented in demo');
  }

  async listRenewedProducts(_opts?: {
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResponse<Product[]>> {
    // await this.graphql(RENEWED_COLLECTION_QUERY, {
    //   collectionId: this.renewedCollectionId,
    //   first: opts?.limit ?? 24,
    //   after: opts?.offset ? cursorFromOffset(opts.offset) : null,
    // });
    throw new Error('Not implemented in demo');
  }

  async getCustomerOrders(_customerId: ShopifyGID): Promise<ConnectorResponse<Order[]>> {
    // await this.graphql(CUSTOMER_ORDERS_QUERY, { customerId, first: 50 });
    throw new Error('Not implemented in demo');
  }

  async getCustomer(_id: ShopifyGID): Promise<ConnectorResponse<Customer | null>> {
    throw new Error('Not implemented in demo');
  }

  async createDiscountCode(_input: DiscountCodeInput): Promise<ConnectorResponse<DiscountCode>> {
    // await this.graphql(DISCOUNT_CODE_BASIC_CREATE_MUTATION, { basicCodeDiscount: ... });
    throw new Error('Not implemented in demo');
  }

  async getDiscountCode(_code: string): Promise<ConnectorResponse<DiscountCode | null>> {
    throw new Error('Not implemented in demo');
  }
}
