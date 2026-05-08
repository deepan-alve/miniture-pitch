# Admin lane (`app/app/(admin)`)

Ops/admin views for the Miniture Buyback demo. Gated to the Ops Admin
account (`ops@miniture.demo`) — parents who deep-link in get bounced to
`/(tabs)`.

## Role gate

`_layout.tsx` checks, in order:

1. `useUserData().defaultRole === 'ops' | 'admin'` (preferred — production wiring)
2. `useUserData().roles` includes `ops` or `admin`
3. fallback: `useUserData().email === 'ops@miniture.demo'`

If none match, render `<Redirect href="/(tabs)" />`. Unauthenticated users
are sent to `/(auth)/sign-in`.

## Screens

| Route | What it shows | Gate | Data |
|---|---|---|---|
| `/(admin)` | Redirect to `/(admin)/pending`. | ops | — |
| `/(admin)/pending` | Live list of return requests in `submitted / pickup_scheduled / in_transit / received / qc_downgraded`. Each card shows parent, product, self-declared grade, time, photo strip. Tap → QC detail. | ops | `useSubscription(ADMIN_PENDING_REQUESTS_SUBSCRIPTION)` over `return_requests` joined to `account`, `owned_unit.product`, `condition_assessments(self_declared)`, `assessment_photos`. |
| `/(admin)/qc/[id]` | Detail view: parent + product summary, photo gallery, self-declared grade, segmented grade picker (Good / Fair / Worn / Unfit), notes textarea, **Approve QC** + **Mark unfit** buttons, timeline of `return_request_events`. | ops | `useQuery(ADMIN_QC_DETAIL_QUERY)` + path-specific approve mutation chain (refurb / trade-in / donate) or reject mutation. |
| `/(admin)/ngo` | Pending donation deliveries (live) + recently delivered (8). "Mark delivered" stamps `delivered_to_ngo_at` and an impact certificate URL. | ops | `useSubscription(ADMIN_NGO_DELIVERIES_SUBSCRIPTION)` + `useQuery(ADMIN_NGO_RECENT_QUERY)` + `ADMIN_CONFIRM_DONATION_MUTATION`. |
| `/(admin)/stub-log` | Live tail of `shopify_stub_log` (50 rows, desc). Each row: operation badge, ok/✕, timestamp, duration_ms, collapsible request + response JSON. New rows pulse yellow→cream over 2s. | ops | `useSubscription(ADMIN_STUB_LOG_SUBSCRIPTION)`. |

## Approve flow (the "wow" hand-off)

The QC detail screen's **Approve** button writes:

1. `condition_assessments` (`phase=qc_verified`, ops-graded)
2. Path-specific outcome:
    - **refurb** → `refurb_listings` + `shopify_stub_products` + `store_credit_ledger` (`refurb_payout`)
    - **trade_in** → `refurb_listings` + `trade_in_credits` + `shopify_stub_products` + `store_credit_ledger` (`trade_in_payout`, expires_at = +12mo)
    - **donate** → `donation_records` + `discount_codes` + `shopify_stub_discount_codes`
3. `shopify_stub_log` (so the connector tab lights up live)
4. `return_request_events` (so the parent's track screen subscription updates instantly)
5. `owned_units.status` (returned / traded_in / donated)
6. `return_requests.status = qc_passed`

When the `approve-qc` Function is deployed, the chain moves server-side.
The screen has `// TODO: move to approve-qc Function once deployed` markers.

## Reject flow

`Mark unfit` writes a `qc_verified` assessment with grade=`unfit`, a
`qc_failed` event, restores `owned_units.status=owned`, and sets
`return_requests.status=qc_failed` — no credit issued.

## Components

`app/components/admin/`:

- `qc-photo-gallery.tsx` — horizontal scroll of assessment_photos with prompt labels.
- `request-timeline.tsx` — vertical Stepper for `return_request_events`.
- `json-preview.tsx` — collapsible pretty-JSON viewer for stub-log payloads.
- `op-badge.tsx` — colored pill per Shopify operation.
- `_primitives.tsx` — local fallbacks (`Input`, `EmptyState`) until the
  consumer agent ships them in `app/components/`.

## GraphQL operations

`app/graphql/operations/admin/`:

- `pending-list.ts` — subscription for the inbox.
- `qc-detail.ts` — single-request detail query.
- `approve-qc.ts` — three mutation variants (refurb / trade-in / donate) +
  reject mutation + first-active-NGO query.
- `ngo-deliveries.ts` — subscription, recent query, confirm mutation.
- `confirm-donation.ts` — re-export wrapper of the confirm mutation.
- `stub-log.ts` — connector-log subscription.
- `index.ts` — barrel.

## Verifying

```
cd app && npx tsc --noEmit       # zero errors
```

Manual:

1. Sign in as `ops@miniture.demo`. The admin tabs appear.
2. Sign in as a parent. Visiting `/(admin)/*` redirects you to `/(tabs)`.
3. With at least one `submitted` return request in the DB, it appears in
    Pending QC within ~1s of insert (subscription).
4. Approve it. The Connector tab gets a `createRenewedProduct` row that
    pulses yellow for 2 seconds. The parent's track screen — subscribed to
    `return_request_events` — flips to "QC approved".

## Caveats / TODO

- `approve-qc` and `confirm-donation` are client-side mutation chains for
  the demo. Move them to Nhost Functions for production. Markers in code.
- Role assignment depends on Agent 1's auth wiring. The email-match
  fallback (`ops@miniture.demo`) is intentionally robust.
- `assessment_photos.storage_path` is treated as an absolute URL when it
  starts with `http(s)://`, otherwise as a Nhost storage file id —
  pending coordination with the consumer photo-upload flow.
- `condition_grade` PG enum is passed as `String!` over the wire and PG
  auto-casts on insert. If Hasura tracks the enum natively, swap to the
  generated GraphQL enum type.
