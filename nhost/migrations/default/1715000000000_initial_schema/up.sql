-- Miniture Buyback — initial schema
-- Apply via Hasura console migration or `hasura migrate apply` once Nhost project is provisioned.
-- Postgres 14+ assumed (Nhost default). All money in INR rupees (integer).

set search_path = public;

create extension if not exists "pgcrypto";

-- =========================================================================
-- Enums
-- =========================================================================

do $$ begin
  create type owned_unit_status as enum (
  'owned',
  'return_pending',
  'returned',
  'donated',
  'traded_in'
);
exception when duplicate_object then null;
end $$;;

do $$ begin
  create type return_path as enum (
  'refurb',
  'trade_in',
  'donate'
);
exception when duplicate_object then null;
end $$;;

do $$ begin
  create type return_status as enum (
  'draft',
  'submitted',
  'pickup_scheduled',
  'in_transit',
  'received',
  'qc_passed',
  'qc_downgraded',
  'qc_failed',
  'completed',
  'cancelled'
);
exception when duplicate_object then null;
end $$;;

do $$ begin
  create type condition_grade as enum (
  'good',
  'fair',
  'worn',
  'unfit'
);
exception when duplicate_object then null;
end $$;;

do $$ begin
  create type assessment_phase as enum (
  'self_declared',
  'qc_verified'
);
exception when duplicate_object then null;
end $$;;

do $$ begin
  create type credit_source_type as enum (
  'refurb_payout',
  'trade_in_payout',
  'donate_thank_you',
  'transfer_in',
  'transfer_out',
  'redemption',
  'expiry'
);
exception when duplicate_object then null;
end $$;;

-- =========================================================================
-- Identity
-- =========================================================================

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,         -- references auth.users(id) (Nhost Auth schema)
  display_name text not null,
  phone text,
  default_address jsonb,
  shopify_customer_gid text unique,          -- the customer GID Shopify would issue; demo generates one per account
  created_at timestamptz not null default now()
);

create index if not exists accounts_phone_idx on accounts (phone);

create table if not exists child_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  birth_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists child_profiles_account_idx on child_profiles (account_id);

-- =========================================================================
-- Catalog (Shopify-mirrored shapes)
-- =========================================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  shopify_product_id text not null unique,
  title text not null,
  description text,
  price_inr integer not null check (price_inr >= 0),
  min_age_months integer,
  max_age_months integer,
  category text,
  hero_image_url text,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on products (category);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  position integer not null default 0
);

create index if not exists product_images_product_idx on product_images (product_id, position);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text not null unique,
  account_id uuid not null references accounts(id) on delete restrict,
  placed_at timestamptz not null,
  total_inr integer not null check (total_inr >= 0),
  created_at timestamptz not null default now()
);

create index if not exists orders_account_idx on orders (account_id, placed_at desc);

create table if not exists order_line_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_inr integer not null check (unit_price_inr >= 0)
);

create index if not exists order_line_items_order_idx on order_line_items (order_id);

-- =========================================================================
-- Buyback core
-- =========================================================================

create table if not exists owned_units (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  order_line_item_id uuid not null references order_line_items(id) on delete restrict,
  acquired_at timestamptz not null,
  status owned_unit_status not null default 'owned',
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists owned_units_account_status_idx on owned_units (account_id, status);
create index if not exists owned_units_product_idx on owned_units (product_id);

create table if not exists return_requests (
  id uuid primary key default gen_random_uuid(),
  owned_unit_id uuid not null unique references owned_units(id) on delete restrict,
  account_id uuid not null references accounts(id) on delete restrict,
  path return_path not null,
  status return_status not null default 'draft',
  self_declared_grade condition_grade,
  pickup_address jsonb,
  pickup_scheduled_for timestamptz,
  pickup_qr_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists return_requests_account_status_idx on return_requests (account_id, status);
create index if not exists return_requests_status_idx on return_requests (status);

-- One open request per unit at a time. Soft-enforced via the unique on owned_unit_id;
-- when a request is cancelled or completed, set owned_unit.status accordingly so a new
-- request would target a different unit (the cancelled-and-retry edge is handled at
-- application layer by allowing UPDATE rather than re-INSERT).

create table if not exists return_request_events (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references return_requests(id) on delete cascade,
  event_type text not null,                  -- 'submitted', 'pickup_scheduled', 'qc_passed', etc.
  actor_account_id uuid references accounts(id),  -- nullable; system events have no actor
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists return_request_events_request_idx on return_request_events (return_request_id, created_at);

create table if not exists condition_assessments (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references return_requests(id) on delete cascade,
  phase assessment_phase not null,
  grade condition_grade not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (return_request_id, phase)          -- one self_declared + one qc_verified per request
);

create table if not exists assessment_photos (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references condition_assessments(id) on delete cascade,
  prompt text not null,                      -- 'front', 'damage', 'all_parts', etc.
  storage_path text not null,                -- Nhost Storage path
  created_at timestamptz not null default now()
);

create index if not exists assessment_photos_assessment_idx on assessment_photos (assessment_id);

-- =========================================================================
-- Path-specific outcomes
-- =========================================================================

create table if not exists ngo_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  has_80g_status boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists refurb_listings (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null unique references return_requests(id) on delete restrict,
  original_product_id uuid not null references products(id) on delete restrict,
  condition_grade condition_grade not null,
  listed_price_inr integer not null check (listed_price_inr >= 0),
  shopify_renewed_product_id text,           -- filled after ShopifyConnector.createProduct() succeeds
  listed_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists refurb_listings_listed_idx on refurb_listings (listed_at desc) where listed_at is not null;
create index if not exists refurb_listings_unsold_idx on refurb_listings (listed_at) where sold_at is null and listed_at is not null;

create table if not exists donation_records (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null unique references return_requests(id) on delete restrict,
  ngo_partner_id uuid not null references ngo_partners(id) on delete restrict,
  delivered_to_ngo_at timestamptz,
  impact_certificate_url text,
  ngo_update_message text,
  ngo_update_image_url text,
  created_at timestamptz not null default now()
);

create index if not exists donation_records_ngo_idx on donation_records (ngo_partner_id);

create table if not exists trade_in_credits (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null unique references return_requests(id) on delete restrict,
  credit_amount_inr integer not null check (credit_amount_inr >= 0),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Credits
-- =========================================================================

create table if not exists store_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  amount_inr integer not null,               -- positive = credit issued, negative = debit
  source_type credit_source_type not null,
  source_id uuid,                            -- references the originating row (return_request_id, transfer_id, etc.)
  expires_at timestamptz,                    -- null = never expires
  created_at timestamptz not null default now()
);

create index if not exists store_credit_ledger_account_idx on store_credit_ledger (account_id, created_at desc);
create index if not exists store_credit_ledger_expiry_idx on store_credit_ledger (expires_at)
  where expires_at is not null;

create table if not exists credit_transfers (
  id uuid primary key default gen_random_uuid(),
  from_account_id uuid not null references accounts(id) on delete restrict,
  to_account_id uuid not null references accounts(id) on delete restrict,
  amount_inr integer not null check (amount_inr > 0),
  message text,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

create index if not exists credit_transfers_from_idx on credit_transfers (from_account_id, created_at desc);
create index if not exists credit_transfers_to_idx on credit_transfers (to_account_id, created_at desc);

create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  code text not null unique,
  discount_pct integer check (discount_pct between 1 and 100),
  discount_amount_inr integer check (discount_amount_inr >= 0),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  shopify_price_rule_id text,                -- filled after ShopifyConnector.createDiscountCode() succeeds
  source_donation_id uuid references donation_records(id),
  created_at timestamptz not null default now(),
  check (
    (discount_pct is not null and discount_amount_inr is null) or
    (discount_pct is null and discount_amount_inr is not null)
  )
);

create index if not exists discount_codes_account_idx on discount_codes (account_id, expires_at);

-- =========================================================================
-- Helpful views (used by the app and admin dashboard)
-- =========================================================================

-- Current store credit balance per account.
create or replace view account_credit_balance as
  select
    account_id,
    coalesce(sum(amount_inr) filter (
      where expires_at is null or expires_at > now()
    ), 0) as balance_inr
  from store_credit_ledger
  group by account_id;

-- What a parent currently owns and is eligible to return.
create or replace view eligible_units as
  select
    ou.id as owned_unit_id,
    ou.account_id,
    ou.product_id,
    p.title,
    p.hero_image_url,
    p.price_inr as original_price_inr,
    ou.acquired_at,
    extract(year from age(now(), ou.acquired_at)) * 12 +
      extract(month from age(now(), ou.acquired_at)) as months_owned
  from owned_units ou
  join products p on p.id = ou.product_id
  where ou.status = 'owned';

-- =========================================================================
-- Triggers (kept minimal — most logic lives in Nhost Functions)
-- =========================================================================

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists return_requests_updated_at on return_requests;
create trigger return_requests_updated_at
  before update on return_requests
  for each row execute function set_updated_at();
