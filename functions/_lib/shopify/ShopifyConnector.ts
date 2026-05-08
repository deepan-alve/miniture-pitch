// The integration boundary.
//
// Every backend Function that touches Shopify (real or fake) goes through this
// interface. To swap demo → production, change the export in `index.ts` from
// `ShopifyStub` to `ShopifyClient` — no other code changes.
//
// The interface is intentionally narrow: only the operations the buyback
// feature actually needs. We add methods as features require them.

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

export interface ShopifyConnector {
  // ---------- Products (Renewed collection writes) ----------

  /**
   * Creates a refurbished product in the Renewed collection.
   * Called when a return request's QC passes and `path` is 'refurb' or 'trade_in'.
   *
   * Production: maps to `productCreate` mutation (Shopify Admin GraphQL).
   * Stub: writes to `shopify_stub_products` table, generates a fake GID.
   */
  createRenewedProduct(input: ProductInput): Promise<ConnectorResponse<Product>>;

  /**
   * Mark a renewed product as sold (used by the demo to simulate purchases
   * and update inventory). In production, sold-out state is driven by
   * Shopify webhooks (`orders/create`), not by us calling.
   */
  markProductSold(id: ShopifyGID): Promise<ConnectorResponse<void>>;

  /**
   * Read a single product. Used to verify a refurb listing exists / is
   * still active.
   */
  getProduct(id: ShopifyGID): Promise<ConnectorResponse<Product | null>>;

  /**
   * List active products in the Renewed collection. Used by the Shop tab's
   * "Miniture Renewed" view.
   *
   * In production, the public Storefront API would handle this and the app
   * would call it directly (no admin auth needed). For the demo, the
   * connector serves both write and read sides for symmetry.
   */
  listRenewedProducts(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResponse<Product[]>>;

  // ---------- Customers / orders (eligibility checks) ----------

  /**
   * Look up the orders a customer has placed. Drives the "My Products" view —
   * a parent can only initiate a return for an item they actually own.
   *
   * Production: maps to `customer.orders` connection (Admin GraphQL).
   * Stub: queries the demo `orders` table joined to `accounts`.
   */
  getCustomerOrders(customerId: ShopifyGID): Promise<ConnectorResponse<Order[]>>;

  getCustomer(id: ShopifyGID): Promise<ConnectorResponse<Customer | null>>;

  // ---------- Discount codes (donate path reward, trade-in credit) ----------

  /**
   * Issue a single-use (or limited) discount code scoped to one customer.
   * Used for the donate path's "15% off your next order" reward.
   *
   * Production: maps to `discountCodeBasicCreate` mutation.
   * Stub: writes to `shopify_stub_discount_codes` table.
   */
  createDiscountCode(input: DiscountCodeInput): Promise<ConnectorResponse<DiscountCode>>;

  getDiscountCode(code: string): Promise<ConnectorResponse<DiscountCode | null>>;
}
