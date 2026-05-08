-- Shopify stub backing tables.
--
-- These tables exist ONLY in the demo. In production, they go away — the
-- ShopifyClient hits real Shopify Admin API and these rows live in
-- Shopify's own database. The connector is the boundary that hides this.

set search_path = public;

-- The "Shopify side" of refurbished products. When the demo connector
-- creates a Renewed listing, it writes here. The Shop tab's Renewed
-- collection view queries this table via the connector (not directly).
create table if not exists shopify_stub_products (
  id uuid primary key default gen_random_uuid(),
  shopify_gid text not null unique,           -- "gid://shopify/Product/<uuid>"
  title text not null,
  description_html text,
  status text not null default 'ACTIVE',      -- 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  tags text[] not null default '{}',
  vendor text default 'Miniture',
  product_type text,
  variant_price_amount text not null,         -- string to mirror Shopify's Money shape
  variant_price_currency text not null default 'INR',
  variant_compare_at_amount text,
  variant_compare_at_currency text,
  variant_sku text,
  variant_inventory_qty integer default 1,
  images jsonb not null default '[]',         -- [{src, altText}]
  metafields jsonb not null default '[]',
  online_store_url text,
  collection_ids text[] not null default '{}',
  sold_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shopify_stub_products_collection_idx on shopify_stub_products using gin (collection_ids);
create index if not exists shopify_stub_products_active_idx on shopify_stub_products (created_at desc) where status = 'ACTIVE' and sold_at is null;
create index if not exists shopify_stub_products_tags_idx on shopify_stub_products using gin (tags);

-- The "Shopify side" of discount codes (price rules + codes in real Shopify).
create table if not exists shopify_stub_discount_codes (
  id uuid primary key default gen_random_uuid(),
  shopify_gid text not null unique,           -- "gid://shopify/DiscountCodeNode/<uuid>"
  code text not null unique,
  percentage_off integer,
  amount_off_amount text,
  amount_off_currency text,
  customer_gid text,                          -- if scoped to one customer
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  redeemed_at timestamptz,
  applies_to_collection_ids text[] not null default '{}',
  once_per_customer boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (percentage_off is not null and amount_off_amount is null) or
    (percentage_off is null and amount_off_amount is not null)
  )
);

create index if not exists shopify_stub_discount_codes_customer_idx on shopify_stub_discount_codes (customer_gid);

-- Audit log of every connector operation. Drives the demo's "see the
-- integration in action" admin view. Goes away in production.
create table if not exists shopify_stub_log (
  id uuid primary key default gen_random_uuid(),
  operation text not null,                    -- 'createRenewedProduct', 'createDiscountCode', etc.
  request_payload jsonb not null,
  response_payload jsonb,
  ok boolean not null,
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists shopify_stub_log_created_idx on shopify_stub_log (created_at desc);
create index if not exists shopify_stub_log_operation_idx on shopify_stub_log (operation, created_at desc);
