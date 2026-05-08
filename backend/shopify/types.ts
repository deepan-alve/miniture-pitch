// Shopify-shaped types.
//
// These mirror the Shopify Admin GraphQL API (2026-01) so production is a swap,
// not a rewrite. Field names, ID format (`gid://shopify/Product/...`), and Money
// shape (amount string + currencyCode) follow Shopify's conventions exactly.

export type ShopifyGID = string; // e.g. "gid://shopify/Product/1234567890"

export interface Money {
  amount: string; // string in Shopify, not number — preserves precision
  currencyCode: string; // ISO 4217, e.g. "INR"
}

export interface ProductImageInput {
  src: string;
  altText?: string;
}

export interface VariantInput {
  price: Money;
  compareAtPrice?: Money; // strike-through "was ₹X" pricing
  sku?: string;
  inventoryQuantity?: number;
}

export interface ProductInput {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[]; // e.g. ["renewed", "condition:good", "category:literacy"]
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  collectionsToJoin?: ShopifyGID[]; // GID of "Miniture Renewed" collection
  images?: ProductImageInput[];
  variant: VariantInput; // single variant for refurb units (no size/color options)
  metafields?: ProductMetafield[]; // for storing condition grade, source unit ID, etc.
}

export interface ProductMetafield {
  namespace: string; // e.g. "miniture_renewed"
  key: string; // e.g. "condition_grade"
  value: string;
  type: 'single_line_text_field' | 'integer' | 'json';
}

export interface Product {
  id: ShopifyGID;
  title: string;
  descriptionHtml: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  tags: string[];
  variant: {
    id: ShopifyGID;
    price: Money;
    compareAtPrice: Money | null;
    sku: string | null;
  };
  images: { src: string; altText: string | null }[];
  onlineStoreUrl: string | null; // public storefront URL once published
  adminUrl: string; // admin panel deep link
}

// ---------- Customer / orders ----------

export interface Customer {
  id: ShopifyGID;
  email: string | null;
  phone: string | null;
  displayName: string;
}

export interface OrderLineItem {
  id: ShopifyGID;
  productId: ShopifyGID;
  productTitle: string;
  variantId: ShopifyGID;
  quantity: number;
  unitPrice: Money;
}

export interface Order {
  id: ShopifyGID;
  customerId: ShopifyGID;
  placedAt: string; // ISO 8601
  totalPrice: Money;
  lineItems: OrderLineItem[];
}

// ---------- Discount codes (for donate path's 15%-off, trade-in credits) ----------

export interface DiscountCodeInput {
  code: string;
  // Either percentage OR fixed-amount, not both.
  percentageOff?: number; // 0..100
  amountOff?: Money;
  // Eligibility
  customerId?: ShopifyGID; // if scoped to a single customer
  startsAt?: string;
  endsAt?: string;
  oncePerCustomer?: boolean;
  appliesOncePerCustomer?: boolean;
  // Optional: restrict to certain collections (e.g. "Renewed only")
  appliesToCollectionIds?: ShopifyGID[];
}

export interface DiscountCode {
  id: ShopifyGID; // PriceRule GID in real Shopify
  code: string;
  percentageOff: number | null;
  amountOff: Money | null;
  startsAt: string;
  endsAt: string;
  redeemedAt: string | null;
}

// ---------- Connector results ----------

export interface ConnectorResult<T> {
  ok: true;
  data: T;
}

export interface ConnectorError {
  ok: false;
  error: {
    code: 'not_found' | 'validation' | 'rate_limited' | 'auth' | 'unknown';
    message: string;
    fieldErrors?: { field: string; message: string }[];
  };
}

export type ConnectorResponse<T> = ConnectorResult<T> | ConnectorError;
