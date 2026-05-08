# Shopify connector — the integration boundary

This module is the seam between the buyback feature and Shopify. **The rest of the backend never talks to Shopify directly** — it goes through `ShopifyConnector`. This makes the demo↔production swap a one-line config change in the factory.

## Structure

| File | Role |
|---|---|
| `types.ts` | Shopify-shaped types — `Product`, `Money`, `Order`, `DiscountCode`, etc. Mirror Shopify Admin GraphQL API 2026-01 shapes (string GIDs, Money objects, etc.) so the production swap doesn't reshape data. |
| `ShopifyConnector.ts` | The interface every consumer depends on. Narrow on purpose — only the operations the buyback feature needs. |
| `ShopifyStub.ts` | The demo implementation. Backed by Postgres tables (`shopify_stub_*`). Logs every operation to `shopify_stub_log` for the admin dashboard's "see the integration fire" view. |
| `ShopifyClient.ts` | The production implementation. **Has the real Admin API GraphQL queries already filled in**; only the HTTP transport (`fetch`) is stubbed. To enable, uncomment the `fetch` call and set the env vars. |
| `index.ts` | Factory. `getShopifyConnector()` returns either the stub or the client based on `CONNECTOR_MODE`. |

## Activating production

```bash
# .env (production)
CONNECTOR_MODE=production
SHOPIFY_SHOP_DOMAIN=miniture.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...           # from a custom app in Shopify admin
SHOPIFY_RENEWED_COLLECTION_GID=gid://shopify/Collection/123456
```

Then in `ShopifyClient.ts`, uncomment the `fetch` block in the `graphql()` helper. **Nothing else changes.** Every Function that calls `getShopifyConnector().createRenewedProduct(...)` keeps working.

## Why this design

A reviewer looking at this folder should see three things, in order:

1. **An interface.** `ShopifyConnector.ts` is the contract. Tells you exactly what surface area we touch — refurb listings, customer orders, discount codes. No more, no less.
2. **A faithful stub.** `ShopifyStub.ts` writes to tables that mirror Shopify's data shape. The stub returns Shopify-shaped objects (GIDs, Money objects, etc.) so the rest of the app never knows it's faked.
3. **A production-ready skeleton.** `ShopifyClient.ts` has the real GraphQL queries (`productCreate`, `discountCodeBasicCreate`, `customer.orders` connection — all from Shopify Admin GraphQL 2026-01). They're not pseudocode; they're the queries we'd ship.

The point isn't the cleverness. The point is that **one engineer-day separates this demo from a working production integration**, and the diff is contained to two files.

## Operations covered

| Operation | Demo writes to | Production maps to |
|---|---|---|
| `createRenewedProduct` | `shopify_stub_products` | `productCreate` mutation |
| `markProductSold` | `shopify_stub_products.sold_at` | (no-op; driven by Shopify webhooks in prod) |
| `getProduct` | `shopify_stub_products` SELECT | `product(id)` query |
| `listRenewedProducts` | `shopify_stub_products` SELECT scoped by collection | `collection.products` query |
| `getCustomerOrders` | `orders` joined to `accounts` | `customer.orders` connection |
| `getCustomer` | `accounts` SELECT | `customer(id)` query |
| `createDiscountCode` | `shopify_stub_discount_codes` | `discountCodeBasicCreate` mutation |
| `getDiscountCode` | `shopify_stub_discount_codes` SELECT | `codeDiscountNodeByCode` query |

## What's NOT in the connector

Things we deliberately do *not* abstract behind this interface, because they belong elsewhere:

- **Webhooks from Shopify** (orders/create, products/update). These will be Nhost Functions that Shopify hits directly. They write to our domain tables (`orders`, `owned_units`) — no connector needed for the receive path.
- **Customer-facing checkout.** That's Shopify's storefront; the app deep-links to it. We never proxy checkout through our backend.
- **Inventory management.** For Renewed items, each refurb is qty=1 by definition. Shopify's inventory API handles its own bookkeeping after creation; we don't track it on our side.
