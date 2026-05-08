# Data Model

The buyback feature's spine. Every screen, every Hasura permission, every Function call hangs off these tables.

## Design principles

1. **Mirror Shopify shapes for product/order data.** `products` and `orders` use the same field names Shopify Admin API returns. When the `ShopifyStub` is swapped for the real `ShopifyClient`, the Hasura tables either get replaced by remote schema joins or stay as a local cache — but app queries don't change.
2. **Every state change is an event, not a mutation in place.** `return_requests` has a `status` column, but its history lives in `return_request_events`. This makes the admin dashboard's audit log free, and lets us rebuild a request's timeline for the user-facing status screen.
3. **Credits are a ledger, not a balance.** `store_credit_ledger` records every issuance, transfer, and redemption as a row. The current balance is `SUM(amount)` per account. This is the same pattern banks use — never edit history, always append.
4. **One condition assessment per request, multiple photos per assessment.** Photos are first-class so we can show the QC team exactly what the parent submitted vs what arrived.
5. **Path-specific tables.** A return request flowers into one of three: `refurb_listings`, `donation_records`, `trade_in_credits`. Each has fields the others don't need (refurb has condition grade + Shopify product ID; donation has NGO + impact certificate URL; trade-in has expiry date).

## Tables

### Identity

#### `accounts`
A parent / customer. Mirrors Nhost Auth's `auth.users` 1:1 (linked by `auth_user_id`). Adds app-specific profile fields (display name, child profiles, address).

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `auth_user_id` | uuid | references `auth.users(id)` from Nhost Auth |
| `display_name` | text | "Josh's Parent" |
| `phone` | text | for credit-transfer recipient lookup |
| `default_address` | jsonb | shipping/pickup address |
| `created_at` | timestamptz | |

#### `child_profiles`
A parent can have multiple children. Drives age-appropriate product filtering and the path-recommendation logic ("only-child + aged-out" → steer toward donate).

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `account_id` | uuid fk | |
| `name` | text | |
| `birth_date` | date | drives age math for filters |

### Catalog (Shopify-mirrored)

#### `products`
The catalog of new Miniture products. In demo, seeded with real items from miniture.in. In production, this is either a Hasura remote schema over Shopify or a periodic sync.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `shopify_product_id` | text unique | the ID Shopify would issue; in demo, generated |
| `title` | text | "FlexDesk" |
| `description` | text | |
| `price_inr` | integer | paise or rupees — pick one and stick (using rupees for simplicity) |
| `min_age_months` | integer | for age-range filtering |
| `max_age_months` | integer | |
| `category` | text | "literacy", "numeracy", "fine_motor", etc. |
| `hero_image_url` | text | |
| `created_at` | timestamptz | |

#### `product_images`
Multiple images per product.

#### `orders`
Mirrors Shopify orders. Used to determine *what a parent owns* — which is the eligibility gate for returns.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `shopify_order_id` | text unique | |
| `account_id` | uuid fk | |
| `placed_at` | timestamptz | |
| `total_inr` | integer | |

#### `order_line_items`
A line item per product purchased in an order. **Each line item with quantity N expands logically into N `owned_units`** when the order is fulfilled.

### Buyback core

#### `owned_units`
**The pivotal table of the whole feature.** Each row is a single physical unit a parent currently owns. Created when an order is fulfilled. Marked `returned` when the parent sends it back.

Why not just use order line items? Because if a parent buys 2 sensory trays, they might return 1 and keep 1. We need per-unit tracking.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `account_id` | uuid fk | current owner |
| `product_id` | uuid fk | |
| `order_line_item_id` | uuid fk | provenance — which order it came from |
| `acquired_at` | timestamptz | when the parent received it |
| `status` | enum | `owned` / `return_pending` / `returned` / `donated` / `traded_in` |
| `returned_at` | timestamptz nullable | |

#### `return_requests`
The parent's request to send a unit back. Each request picks one of three paths.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `owned_unit_id` | uuid fk unique | one open request per unit at a time |
| `account_id` | uuid fk | denormalized for permission rules |
| `path` | enum | `refurb` / `trade_in` / `donate` |
| `status` | enum | see state machine below |
| `self_declared_grade` | enum | `good` / `fair` / `worn` — what the parent said |
| `pickup_address` | jsonb | |
| `pickup_scheduled_for` | timestamptz | |
| `pickup_qr_code` | text | scanned by courier |
| `created_at` | timestamptz | |

**Status state machine:**

```
draft → submitted → pickup_scheduled → in_transit → received
  → qc_passed | qc_downgraded (parent must accept) | qc_failed
  → completed
                                                   ↘ cancelled (any earlier state)
```

#### `return_request_events`
Append-only log of state transitions and admin actions.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `return_request_id` | uuid fk | |
| `event_type` | text | `submitted`, `pickup_scheduled`, `qc_passed`, etc. |
| `actor_account_id` | uuid fk nullable | who caused it (parent, ops, admin) |
| `payload` | jsonb | event-specific data |
| `created_at` | timestamptz | |

#### `condition_assessments`
What the parent submitted at intake (with photos), and what ops verified post-receipt.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `return_request_id` | uuid fk | |
| `phase` | enum | `self_declared` / `qc_verified` |
| `grade` | enum | `good` / `fair` / `worn` / `unfit` |
| `notes` | text nullable | ops can add "missing piece A" |
| `created_at` | timestamptz | |

#### `assessment_photos`
Photos attached to an assessment. Stored in Nhost Storage; this table holds the path + which prompt the photo answered.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `assessment_id` | uuid fk | |
| `prompt` | text | "front", "damage", "all_parts" |
| `storage_path` | text | Nhost Storage path |

### Path-specific outcomes

#### `refurb_listings`
Created when a return request's `path = 'refurb'` passes QC. This is the row that triggers `ShopifyConnector.createProduct()` to publish the unit to the Renewed collection.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `return_request_id` | uuid fk unique | |
| `original_product_id` | uuid fk | the new-product template |
| `condition_grade` | enum | `good` / `fair` / `worn` |
| `listed_price_inr` | integer | derived from condition + original price |
| `shopify_renewed_product_id` | text nullable | filled in after connector call succeeds |
| `listed_at` | timestamptz nullable | |
| `sold_at` | timestamptz nullable | |

#### `donation_records`
Created when `path = 'donate'`. Tracks the NGO partner and the impact certificate.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `return_request_id` | uuid fk unique | |
| `ngo_partner_id` | uuid fk | |
| `delivered_to_ngo_at` | timestamptz nullable | |
| `impact_certificate_url` | text nullable | generated PDF in Nhost Storage |
| `ngo_update_message` | text nullable | "Now used at Anganwadi 12" |
| `ngo_update_image_url` | text nullable | |

#### `trade_in_credits`
Created when `path = 'trade_in'`. Same physical pipeline as refurb (the unit still gets refurbished and listed), but the credit type and expiry differ.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `return_request_id` | uuid fk unique | |
| `credit_amount_inr` | integer | |
| `expires_at` | timestamptz | 12 months from issuance |
| `consumed_at` | timestamptz nullable | |

### Partners

#### `ngo_partners`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `name` | text | "Smile Foundation" |
| `description` | text | |
| `logo_url` | text | |
| `has_80g_status` | boolean | for v2 convert-and-donate flow |
| `active` | boolean | |

### Credits

#### `store_credit_ledger`
**Append-only.** Every credit operation is a row. Balance = `SUM(amount_inr) WHERE account_id = X`.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `account_id` | uuid fk | the account being credited or debited |
| `amount_inr` | integer | positive = issued, negative = redeemed/transferred-out |
| `source_type` | enum | `refurb_payout` / `trade_in_payout` / `donate_thank_you` / `transfer_in` / `transfer_out` / `redemption` / `expiry` |
| `source_id` | uuid nullable | references the originating row (return_request_id, transfer_id, etc.) |
| `expires_at` | timestamptz nullable | trade-in credit expires; refurb credit doesn't |
| `created_at` | timestamptz | |

#### `credit_transfers`
The giftable-credit feature. A parent transfers credit to another account.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `from_account_id` | uuid fk | |
| `to_account_id` | uuid fk | |
| `amount_inr` | integer | |
| `message` | text nullable | "Happy birthday from Aunty!" |
| `created_at` | timestamptz | |

A transfer creates **two** ledger rows: a `transfer_out` (negative) on `from_account_id` and a `transfer_in` (positive) on `to_account_id`. The transfer table itself is metadata.

#### `discount_codes`
For the donate path's "15% off next order" reward, and the trade-in's Shopify discount code if we choose that route.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `account_id` | uuid fk | |
| `code` | text unique | the actual code string |
| `discount_pct` | integer nullable | |
| `discount_amount_inr` | integer nullable | one or the other |
| `expires_at` | timestamptz | |
| `redeemed_at` | timestamptz nullable | |
| `shopify_price_rule_id` | text nullable | filled in after connector call |

## Row-level security (Hasura permissions)

- `parent` role:
  - SELECT/INSERT/UPDATE on their own `accounts`, `child_profiles`, `return_requests`, `condition_assessments`, `assessment_photos`, `credit_transfers` (as sender)
  - SELECT on their own `owned_units`, `orders`, `order_line_items`, `refurb_listings`, `donation_records`, `trade_in_credits`, `store_credit_ledger`, `discount_codes`
  - SELECT on `products`, `product_images`, `ngo_partners` (public catalog)
- `ops` role: SELECT/UPDATE on all return_requests, condition_assessments, refurb_listings, donation_records (no parent data beyond what's needed for the QC workflow)
- `admin` role: full access (for the demo's seeded admin account)

## How it maps to the user flow

- Parent opens "My Products" → query `owned_units WHERE account_id = me AND status = 'owned'`
- Taps a unit → "Return / Donate / Trade-in" → INSERT `return_requests` (status `draft`)
- Photo flow → INSERT `condition_assessments` (`phase = 'self_declared'`) + N `assessment_photos`
- Path choice → UPDATE `return_requests.path`, then `submitReturnRequest()` Function: status → `submitted`, generates QR, books pickup
- Ops scans QR, marks received → status → `received`
- Ops fills QC form → INSERT `condition_assessments` (`phase = 'qc_verified'`), status → `qc_passed`
- `approveQC()` Function fans out:
  - If refurb/trade_in: INSERT `refurb_listings`, calls `ShopifyConnector.createProduct()`, fills in `shopify_renewed_product_id`. INSERT `store_credit_ledger` row.
  - If donate: INSERT `donation_records`. Generates impact certificate PDF, INSERT `discount_codes` row.
- All status changes append to `return_request_events`; the parent's app subscribes to changes and updates live.
