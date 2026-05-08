# Functions — Miniture Buyback backend

Six Nhost serverless Functions covering the buyback feature's server-side
logic, plus a small `_lib/` of shared utilities.

## Layout

```
functions/
├── _lib/
│   ├── hasura.ts            # admin GraphQL helper + JWT-claim parser
│   ├── pricing.ts           # refurb / trade-in / donate credit math
│   ├── impact-cert.ts       # SVG impact-certificate generator + storage upload
│   └── shopify/             # mirror of backend/shopify (so Functions are self-contained
│       ├── ShopifyConnector.ts
│       ├── ShopifyStub.ts   # writes to shopify_stub_* tables (demo)
│       ├── ShopifyClient.ts # production skeleton (not enabled in demo)
│       ├── types.ts
│       └── index.ts         # getShopifyConnector() factory
├── sync-account-from-auth.ts
├── submit-return-request.ts
├── approve-qc.ts
├── confirm-donation.ts
├── transfer-credit.ts
├── list-pending-qc.ts
├── package.json
├── tsconfig.json
└── README.md   ← you are here
```

`tsconfig.json` reuses `app/node_modules/@types` so we don't have to
duplicate the toolchain. `npx tsc --noEmit -p .` from this directory
typechecks cleanly.

## Why a copy of `backend/shopify` lives in `_lib/`

Nhost packages each Function with its own slice of the repo, so relative
imports above `functions/` are flaky in deployment. Keeping a copy here
makes the deployment unit self-contained. The two copies are identical
today; in production the `_lib/shopify` copy could be replaced with an npm
package version of the connector.

The copied `ShopifyStub.ts` has one syntax fix vs the original (a missing
trailing comma in `getCustomerOrders`). The original is in the
`backend/shopify/` lane boundary so we left it untouched for the Pitch
agent to fix.

## Connector mode

Each Function picks the connector implementation from
`process.env.CONNECTOR_MODE`:

* `stub` (default for demo) — backed by `shopify_stub_*` tables.
* `production` — uses `ShopifyClient.ts`. Requires `SHOPIFY_SHOP_DOMAIN`,
  `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_RENEWED_COLLECTION_GID`. Nothing
  in any Function changes when you flip this — the connector boundary is
  the seam.

## Functions

### `POST /v1/sync-account-from-auth`

Wires a freshly-created Nhost auth user to a seeded `accounts` row.

* **Body:** `{ email, auth_user_id }`
* **Reply:** `{ account_id, kind: 'linked'|'created', display_name, role }`
* **Auth:** none required (called from sign-up callback).
* **Connector calls:** none.
* **Side effects:**
  * Known demo email (`josh.parent@`, `maya.mom@`, `ops@miniture.demo`):
    UPDATE the matching `accounts.auth_user_id`.
  * `ops@miniture.demo` additionally has its `auth.users.defaultRole`
    flipped to `'ops'` so subsequent JWTs carry the right role claim.
  * Unknown email: INSERT a new account row with a generated display name
    and a synthetic `shopify_customer_gid`.

### `POST /v1/submit-return-request`

Parent submits a return-request for one of their owned units.

* **Body:** `{ owned_unit_id, path, self_declared_grade, pickup_address, pickup_scheduled_for }`
* **Reply:** `{ return_request_id, qr_code, status: 'submitted' }`
* **Auth:** parent JWT required (uses `x-hasura-user-id`).
* **Connector calls:** none.
* **Side effects:**
  * Verifies the unit belongs to the caller and is in `owned`.
  * INSERT `return_requests` with status `submitted`, generates a UUIDv4
    QR code.
  * UPDATE `owned_units.status = 'return_pending'`.
  * INSERT `return_request_events` (`event_type = 'submitted'`).

### `POST /v1/approve-qc`

Ops verifies the QC and fan-outs to the right path-specific outcome.

* **Body:** `{ return_request_id, verified_grade, notes? }`
* **Reply (refurb / trade_in):**
  ```
  {
    status: 'qc_passed' | 'qc_downgraded',
    refurb_listing_id, shopify_renewed_product_gid,
    credit_amount_inr, ledger_id,
    trade_in_credit_id?
  }
  ```
* **Reply (donate):** `{ status: 'completed', donation_record_id }`
* **Auth:** ops or admin role required.
* **Connector calls:**
  * Refurb / trade-in: `getShopifyConnector().createRenewedProduct(...)`
* **Side effects (refurb / trade-in):**
  * UPSERT `condition_assessments` (phase = `qc_verified`).
  * UPDATE `return_requests.status` (`qc_passed` if matched parent's
    self-declared grade, else `qc_downgraded`).
  * INSERT `refurb_listings`, then patch with `shopify_renewed_product_id`
    + `listed_at` after the connector call.
  * INSERT `store_credit_ledger` (positive row, source `refurb_payout` or
    `trade_in_payout`).
  * If trade-in: INSERT `trade_in_credits` with 12-month expiry.
  * UPDATE `owned_units.status = 'returned'` (refurb) or `'traded_in'`.
  * Append events for each transition.
* **Side effects (donate):**
  * INSERT `donation_records` against the first active NGO partner.
  * UPDATE `return_requests.status = 'completed'`.
  * UPDATE `owned_units.status = 'donated'`.
  * Discount code + impact certificate are deferred to
    `confirm-donation` (when ops marks the goods as delivered).
* **Edge: `verified_grade = 'unfit'`** — request transitions to
  `qc_failed`, no listing or credit is created.

### `POST /v1/confirm-donation`

Ops confirms the NGO has received the donated unit. Fires the parent's
thank-you reward.

* **Body:** `{ donation_record_id }`
* **Reply:** `{ donation_record_id, impact_certificate_url, discount_code, discount_id }`
* **Auth:** ops or admin role required.
* **Connector calls:** `createDiscountCode` (15% off, customer-scoped, 90-day expiry).
* **Side effects:**
  * UPDATE `donation_records.delivered_to_ngo_at = now()`.
  * Render an SVG impact certificate (cream + orange Miniture style),
    upload it to Nhost Storage, and store the URL in
    `donation_records.impact_certificate_url`. If the storage upload fails
    (e.g. bucket not configured) we fall back to a `data:` URL so the demo
    keeps working.
  * INSERT `discount_codes` mirror row.
  * Append `return_request_events` (`event_type = 'donation_confirmed'`).

### `POST /v1/transfer-credit`

Parent gifts store credit to another account (the demo's "transferable
credit" feature).

* **Body:** `{ recipient_phone_or_email, amount_inr, message? }`
* **Reply:** `{ transfer_id, from_account_id, to_account_id, amount_inr }`
* **Auth:** parent JWT required.
* **Connector calls:** none.
* **Side effects:**
  * Sender resolved from `x-hasura-user-id`; recipient by `accounts.phone`,
    fallback to `auth.users.email`.
  * Verifies sender's available balance (sum of non-expired ledger rows).
    Throws `400` with a clear error if insufficient.
  * INSERT `credit_transfers`.
  * INSERT two `store_credit_ledger` rows: `transfer_out` (negative) on
    sender, `transfer_in` (positive) on recipient. Both link back to the
    transfer via `source_id`.

### `GET /v1/list-pending-qc`

Thin Hasura proxy returning items that ops needs to QC.

* **Reply:** `{ items: [{ return_request_id, status, path, self_declared_grade, created_at, account_display_name, product_title, pickup_scheduled_for, photos: [{prompt, storage_path}] }] }`
* **Auth:** ops or admin role required.
* **Connector calls:** none.
* **Notes:** This could be a Hasura query from the admin app directly, but
  exposing it as a Function gives the admin a clean URL to call and a
  single place to add caching / shape changes.

## Permissions (lives in `scripts/apply-permissions.py`)

Three roles are wired up in Hasura:

| Role | Default for | Source of truth |
|---|---|---|
| `parent` | normal Nhost sign-ups | `auth.users.defaultRole = 'parent'` (set in `nhost/nhost.toml` `[auth.user.roles]`) |
| `ops` | warehouse / QC operator | `auth.users.defaultRole = 'ops'` set per-user via `sync-account-from-auth` for the demo ops account |
| `admin` | superuser | currently only the admin secret; can be added explicitly via Hasura `update_users.defaultRole = 'admin'` |

Rules in `scripts/apply-permissions.py`:

* parent gets row-level SELECT on every parent-scoped table by traversing
  the `account.auth_user_id._eq: X-Hasura-User-Id` chain;
  INSERT/UPDATE/DELETE only where the matrix in the agent prompt allows
  (e.g. `child_profiles` full CRUD, `accounts` UPDATE on non-sensitive
  cols, `condition_assessments` INSERT only with phase `self_declared`).
* ops gets unfiltered SELECT on all parent-scoped tables and INSERT on
  the QC and outcome tables.
* admin gets full CRUD everywhere.
* `public` (unauthenticated) gets SELECT on `products`, `product_images`,
  and `ngo_partners` (active only) — for the marketing pages.

The script also adds three manual object relationships Hasura couldn't
infer:

* `eligible_units.account → accounts (account_id → id)`
* `account_credit_balance.account → accounts (account_id → id)`
* `shopify_stub_discount_codes.account → accounts (customer_gid → shopify_customer_gid)`

…so parent-scoped filters can pivot through them like every other table.

The script is idempotent: it computes the drop list from the live
metadata first, drops in 60-action chunks, then applies all 148 create
actions in 50-action chunks. Re-running it converges to the same final
state.

## How to (re-)apply

```bash
set -a; source .cloud-admin-secret; set +a
python3 scripts/apply-permissions.py
```

You'll see a summary like:

```
==> Permissions applied
    by role:
      admin     82
      ops       33
      parent    30
      public     3

==> Verifying with parent JWT simulation
    [Josh's parent] owned_units rows: 6 (expected 6) — OK
    [Maya's mom] owned_units rows: 4 (expected 4) — OK
```

## Smoke test

`scripts/smoke-test.py` runs the canonical refurb path against the cloud
end-to-end (with cleanup) and checks every side effect. Run with the
admin secret sourced and the SOCKS5 proxy up:

```bash
set -a; source .cloud-admin-secret; set +a
python3 scripts/smoke-test.py
```

Last run output:

```
[1] Pick Josh's FlexDesk owned_unit
    Josh's Parent's FlexDesk 6-in-1 Multi-Feature Study Table (₹15499, status=owned)
[2] Submit return request (path=refurb, self_declared_grade=good)
[3] Approve QC (verified_grade=good)
    credit=₹7245  ledger=...
[4] Verify side-effects
    refurb_listing OK  price=₹8524
    store_credit_ledger OK  +₹7245 as refurb_payout
    shopify_stub_log OK  1 createRenewedProduct entries (this run)
    owned_units OK  status=returned
[5] Cleanup test artefacts
SMOKE OK
```

## Deployment caveat

These Functions are **not** deployed to Nhost in this build — the demo
runs against the cloud Postgres + Hasura with the Function logic invoked
either:

1. **From the smoke test** via direct Hasura admin GraphQL calls (drives
   the same SQL the Function would; the connector logic is mirrored
   inline in the script).
2. **Future deployment**: push to a GitHub-connected Nhost project and
   each `*.ts` lands at
   `https://<sub>.functions.<region>.nhost.run/v1/<filename>`.

For the live demo, the app calls Hasura GraphQL directly with the parent
JWT for everything that's a pure read or simple write, and would call
these Functions for the multi-step orchestration (submit-return,
approve-qc, etc.). Until they're deployed, the admin agent can call the
same logic from the admin dashboard via a thin in-app helper that posts
to Hasura with the admin secret (or, more correctly, an Action wired
through Hasura).

## Auth role config

`nhost/nhost.toml` was updated:

```toml
[auth.user.roles]
default = 'parent'
allowed = ['parent', 'ops', 'admin', 'user', 'me']
```

To push this to cloud, run:

```bash
nhost config apply --subdomain ntytiuebfzzodrotraun --yes
```

(Not done by this lane's automation because `nhost` CLI doesn't honour
SOCKS5 for the config endpoint; needs to be run manually from a network
that has direct HTTPS to Nhost, or with a proxy-aware wrapper.)
