// Demo Shopify implementation, backed by Postgres via Hasura.
//
// This is what the demo runs. All operations write/read against the
// `shopify_stub_*` tables, mirroring what real Shopify would do. Every
// operation is also logged to `shopify_stub_log` so the admin dashboard
// can show "see, the integration just fired" in real time.

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

interface HasuraClient {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

const RENEWED_COLLECTION_GID = 'gid://shopify/Collection/miniture-renewed';

function gid(resource: string): ShopifyGID {
  return `gid://shopify/${resource}/${crypto.randomUUID()}`;
}

export class ShopifyStub implements ShopifyConnector {
  constructor(private readonly hasura: HasuraClient) {}

  private async log(
    operation: string,
    requestPayload: unknown,
    fn: () => Promise<unknown>,
  ): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
    const start = Date.now();
    try {
      const data = await fn();
      await this.hasura.query(
        /* GraphQL */ `
          mutation StubLog($operation: String!, $request: jsonb!, $response: jsonb!, $duration: Int!) {
            insert_shopify_stub_log_one(
              object: {
                operation: $operation
                request_payload: $request
                response_payload: $response
                ok: true
                duration_ms: $duration
              }
            ) { id }
          }
        `,
        {
          operation,
          request: requestPayload,
          response: data,
          duration: Date.now() - start,
        },
      );
      return { ok: true, data };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.hasura.query(
        /* GraphQL */ `
          mutation StubLogError($operation: String!, $request: jsonb!, $error: String!, $duration: Int!) {
            insert_shopify_stub_log_one(
              object: {
                operation: $operation
                request_payload: $request
                ok: false
                error_message: $error
                duration_ms: $duration
              }
            ) { id }
          }
        `,
        {
          operation,
          request: requestPayload,
          error: message,
          duration: Date.now() - start,
        },
      );
      return { ok: false, message };
    }
  }

  // ---------- Products ----------

  async createRenewedProduct(input: ProductInput): Promise<ConnectorResponse<Product>> {
    const result = await this.log('createRenewedProduct', input, async () => {
      const newGid = gid('Product');
      const collections = Array.from(
        new Set([...(input.collectionsToJoin ?? []), RENEWED_COLLECTION_GID]),
      );
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const onlineUrl = `https://miniture.in/products/${slug}-${newGid.split('/').pop()}`;

      const inserted = await this.hasura.query<{
        insert_shopify_stub_products_one: { id: string };
      }>(
        /* GraphQL */ `
          mutation StubProductCreate(
            $shopify_gid: String!
            $title: String!
            $description_html: String
            $status: String!
            $tags: _text!
            $vendor: String
            $product_type: String
            $price_amount: String!
            $price_currency: String!
            $compare_amount: String
            $compare_currency: String
            $sku: String
            $inv_qty: Int
            $images: jsonb!
            $metafields: jsonb!
            $online_store_url: String
            $collection_ids: _text!
          ) {
            insert_shopify_stub_products_one(
              object: {
                shopify_gid: $shopify_gid
                title: $title
                description_html: $description_html
                status: $status
                tags: $tags
                vendor: $vendor
                product_type: $product_type
                variant_price_amount: $price_amount
                variant_price_currency: $price_currency
                variant_compare_at_amount: $compare_amount
                variant_compare_at_currency: $compare_currency
                variant_sku: $sku
                variant_inventory_qty: $inv_qty
                images: $images
                metafields: $metafields
                online_store_url: $online_store_url
                collection_ids: $collection_ids
              }
            ) { id }
          }
        `,
        {
          shopify_gid: newGid,
          title: input.title,
          description_html: input.descriptionHtml ?? null,
          status: input.status ?? 'ACTIVE',
          tags: `{${(input.tags ?? []).map((t) => `"${t}"`).join(',')}}`,
          vendor: input.vendor ?? 'Miniture',
          product_type: input.productType ?? null,
          price_amount: input.variant.price.amount,
          price_currency: input.variant.price.currencyCode,
          compare_amount: input.variant.compareAtPrice?.amount ?? null,
          compare_currency: input.variant.compareAtPrice?.currencyCode ?? null,
          sku: input.variant.sku ?? null,
          inv_qty: input.variant.inventoryQuantity ?? 1,
          images: input.images ?? [],
          metafields: input.metafields ?? [],
          online_store_url: onlineUrl,
          collection_ids: `{${collections.map((c) => `"${c}"`).join(',')}}`,
        },
      );

      return this.toProduct({
        shopify_gid: newGid,
        title: input.title,
        description_html: input.descriptionHtml ?? null,
        status: input.status ?? 'ACTIVE',
        tags: input.tags ?? [],
        variant_price_amount: input.variant.price.amount,
        variant_price_currency: input.variant.price.currencyCode,
        variant_compare_at_amount: input.variant.compareAtPrice?.amount ?? null,
        variant_compare_at_currency: input.variant.compareAtPrice?.currencyCode ?? null,
        variant_sku: input.variant.sku ?? null,
        images: input.images ?? [],
        online_store_url: onlineUrl,
        _row_id: inserted.insert_shopify_stub_products_one.id,
      });
    });

    if (result.ok) return { ok: true, data: result.data as Product };
    return { ok: false, error: { code: 'unknown', message: result.message } };
  }

  async markProductSold(id: ShopifyGID): Promise<ConnectorResponse<void>> {
    const result = await this.log('markProductSold', { id }, async () => {
      await this.hasura.query(
        /* GraphQL */ `
          mutation StubProductSold($gid: String!) {
            update_shopify_stub_products(
              where: { shopify_gid: { _eq: $gid } }
              _set: { sold_at: "now()" }
            ) { affected_rows }
          }
        `,
        { gid: id },
      );
      return null;
    });
    if (result.ok) return { ok: true, data: undefined };
    return { ok: false, error: { code: 'unknown', message: result.message } };
  }

  async getProduct(id: ShopifyGID): Promise<ConnectorResponse<Product | null>> {
    const result = await this.log('getProduct', { id }, async () => {
      const res = await this.hasura.query<{ shopify_stub_products: any[] }>(
        /* GraphQL */ `
          query StubProduct($gid: String!) {
            shopify_stub_products(where: { shopify_gid: { _eq: $gid } }, limit: 1) {
              shopify_gid title description_html status tags
              variant_price_amount variant_price_currency
              variant_compare_at_amount variant_compare_at_currency variant_sku
              images online_store_url
            }
          }
        `,
        { gid: id },
      );
      const row = res.shopify_stub_products[0];
      return row ? this.toProduct(row) : null;
    });
    if (result.ok) return { ok: true, data: result.data as Product | null };
    return { ok: false, error: { code: 'unknown', message: result.message } };
  }

  async listRenewedProducts(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResponse<Product[]>> {
    const result = await this.log('listRenewedProducts', opts ?? {}, async () => {
      const res = await this.hasura.query<{ shopify_stub_products: any[] }>(
        /* GraphQL */ `
          query StubRenewedList($limit: Int!, $offset: Int!, $collection: String!) {
            shopify_stub_products(
              where: {
                status: { _eq: "ACTIVE" }
                sold_at: { _is_null: true }
                collection_ids: { _contains: [$collection] }
              }
              order_by: { created_at: desc }
              limit: $limit
              offset: $offset
            ) {
              shopify_gid title description_html status tags
              variant_price_amount variant_price_currency
              variant_compare_at_amount variant_compare_at_currency variant_sku
              images online_store_url
            }
          }
        `,
        {
          limit: opts?.limit ?? 24,
          offset: opts?.offset ?? 0,
          collection: RENEWED_COLLECTION_GID,
        },
      );
      return res.shopify_stub_products.map((r) => this.toProduct(r));
    });
    if (result.ok) return { ok: true, data: result.data as Product[] };
    return { ok: false, error: { code: 'unknown', message: result.message } };
  }

  // ---------- Customers / orders ----------

  async getCustomerOrders(customerId: ShopifyGID): Promise<ConnectorResponse<Order[]>> {
    const result = await this.log('getCustomerOrders', { customerId }, async () => {
      // For the demo, the "Shopify customer ID" is the same as the account's
      // shopify_customer_gid — we look it up via the orders table joined
      // through accounts. Real Shopify would not need the join.
      const res = await this.hasura.query<any>(
        /* GraphQL */ `
          query StubCustomerOrders($customerGid: String!) {
            orders(
              where: { account: { shopify_customer_gid: { _eq: $customerGid } } }
              order_by: { placed_at: desc }
            ) {
              shopify_order_id
              placed_at
              total_inr
              account { shopify_customer_gid }
              order_line_items {
                id
                quantity
                unit_price_inr
                product { shopify_product_id title }
              }
            }
          }
        `,
        { customerGid: customerId },
      );

      return res.orders.map((o: any) => ({
        id: o.shopify_order_id,
        customerId: o.account.shopify_customer_gid,
        placedAt: o.placed_at,
        totalPrice: { amount: String(o.total_inr), currencyCode: 'INR' },
        lineItems: o.order_line_items.map((li: any) => ({
          id: `gid://shopify/LineItem/${li.id}`,
          productId: li.product.shopify_product_id,
          productTitle: li.product.title,
          variantId: `gid://shopify/ProductVariant/${li.product.shopify_product_id}`, // single variant per product in demo
          quantity: li.quantity,
          unitPrice: { amount: String(li.unit_price_inr), currencyCode: 'INR' },
        })),
      }));
    });
    if (result.ok) return { ok: true, data: result.data as Order[] };
    return { ok: false, error: { code: 'unknown', message: result.message } };
  }

  async getCustomer(id: ShopifyGID): Promise<ConnectorResponse<Customer | null>> {
    const result = await this.log('getCustomer', { id }, async () => {
      const res = await this.hasura.query<any>(
        /* GraphQL */ `
          query StubCustomer($gid: String!) {
            accounts(where: { shopify_customer_gid: { _eq: $gid } }, limit: 1) {
              shopify_customer_gid display_name phone
            }
          }
        `,
        { gid: id },
      );
      const a = res.accounts[0];
      if (!a) return null;
      return {
        id: a.shopify_customer_gid,
        email: null,
        phone: a.phone,
        displayName: a.display_name,
      };
    });
    if (result.ok) return { ok: true, data: result.data as Customer | null };
    return { ok: false, error: { code: 'unknown', message: result.message } };
  }

  // ---------- Discount codes ----------

  async createDiscountCode(input: DiscountCodeInput): Promise<ConnectorResponse<DiscountCode>> {
    const result = await this.log('createDiscountCode', input, async () => {
      const newGid = gid('DiscountCodeNode');
      await this.hasura.query(
        /* GraphQL */ `
          mutation StubDiscountCreate(
            $gid: String!
            $code: String!
            $pct: Int
            $amount: String
            $amount_currency: String
            $customer: String
            $starts_at: timestamptz!
            $ends_at: timestamptz!
            $collections: _text!
            $once: Boolean!
          ) {
            insert_shopify_stub_discount_codes_one(
              object: {
                shopify_gid: $gid
                code: $code
                percentage_off: $pct
                amount_off_amount: $amount
                amount_off_currency: $amount_currency
                customer_gid: $customer
                starts_at: $starts_at
                ends_at: $ends_at
                applies_to_collection_ids: $collections
                once_per_customer: $once
              }
            ) { id }
          }
        `,
        {
          gid: newGid,
          code: input.code,
          pct: input.percentageOff ?? null,
          amount: input.amountOff?.amount ?? null,
          amount_currency: input.amountOff?.currencyCode ?? null,
          customer: input.customerId ?? null,
          starts_at: input.startsAt ?? new Date().toISOString(),
          ends_at: input.endsAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          collections: `{${(input.appliesToCollectionIds ?? []).map((c) => `"${c}"`).join(',')}}`,
          once: input.oncePerCustomer ?? true,
        },
      );

      return {
        id: newGid,
        code: input.code,
        percentageOff: input.percentageOff ?? null,
        amountOff: input.amountOff ?? null,
        startsAt: input.startsAt ?? new Date().toISOString(),
        endsAt: input.endsAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        redeemedAt: null,
      };
    });
    if (result.ok) return { ok: true, data: result.data as DiscountCode };
    return { ok: false, error: { code: 'unknown', message: result.message } };
  }

  async getDiscountCode(code: string): Promise<ConnectorResponse<DiscountCode | null>> {
    const result = await this.log('getDiscountCode', { code }, async () => {
      const res = await this.hasura.query<any>(
        /* GraphQL */ `
          query StubDiscountByCode($code: String!) {
            shopify_stub_discount_codes(where: { code: { _eq: $code } }, limit: 1) {
              shopify_gid code percentage_off amount_off_amount amount_off_currency
              starts_at ends_at redeemed_at
            }
          }
        `,
        { code },
      );
      const r = res.shopify_stub_discount_codes[0];
      if (!r) return null;
      return {
        id: r.shopify_gid,
        code: r.code,
        percentageOff: r.percentage_off,
        amountOff:
          r.amount_off_amount != null
            ? { amount: r.amount_off_amount, currencyCode: r.amount_off_currency }
            : null,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        redeemedAt: r.redeemed_at,
      };
    });
    if (result.ok) return { ok: true, data: result.data as DiscountCode | null };
    return { ok: false, error: { code: 'unknown', message: result.message } };
  }

  // ---------- Helpers ----------

  private toProduct(row: any): Product {
    return {
      id: row.shopify_gid,
      title: row.title,
      descriptionHtml: row.description_html,
      status: row.status,
      tags: row.tags ?? [],
      variant: {
        id: `${row.shopify_gid}/variant`,
        price: { amount: row.variant_price_amount, currencyCode: row.variant_price_currency },
        compareAtPrice:
          row.variant_compare_at_amount != null
            ? {
                amount: row.variant_compare_at_amount,
                currencyCode: row.variant_compare_at_currency,
              }
            : null,
        sku: row.variant_sku,
      },
      images: row.images ?? [],
      onlineStoreUrl: row.online_store_url,
      adminUrl: `https://admin.shopify.com/products/${row.shopify_gid.split('/').pop()}`,
    };
  }
}
