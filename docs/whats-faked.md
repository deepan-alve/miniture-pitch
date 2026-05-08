# What's faked

A complete inventory of what's stubbed in the demo and what the production wiring looks like. The point of this doc isn't to apologize — it's to show that every fake is a deliberate scope choice with a known production path.

The **Diff** column is the most important one. "Swap one factory line" and "1–2 weeks per partner" are very different conversations, and the pitch lives or dies on knowing the difference.

## Matrix

| # | Component | Demo (current) | Production (real) | Diff |
|---|---|---|---|---|
| 1 | **Shopify product create (Renewed)** | `ShopifyStub.createRenewedProduct` writes a row to `shopify_stub_products` and returns a fake `gid://shopify/Product/...` GID. | `ShopifyClient.createRenewedProduct` calls Admin GraphQL `productCreate` mutation. The mutation text is already in `backend/shopify/ShopifyClient.ts` (constant `PRODUCT_CREATE_MUTATION`). | Swap factory line in `backend/shopify/index.ts` from `ShopifyStub` to `ShopifyClient`. Uncomment the `fetch` block in `ShopifyClient.graphql()`. Set 3 env vars. **~30 minutes including a smoke test.** |
| 2 | **Shopify discount code create** (donate path's 15% off) | `ShopifyStub.createDiscountCode` writes to `shopify_stub_discount_codes`, returns a synthetic code like `MINI-DONATE-A7K2`. | `ShopifyClient.createDiscountCode` calls `discountCodeBasicCreate` mutation. Mutation already filled in. | Same factory swap as #1 — covered by the same change. |
| 3 | **Customer order lookup** (drives My Products eligibility) | Reads from local `orders` + `order_line_items` + `owned_units` tables, seeded with realistic data. | `ShopifyClient.getCustomerOrders` calls Admin GraphQL `customer.orders` connection. We'd also wire a Shopify webhook on `orders/fulfilled` to populate `owned_units` rows in real time. | Connector swap covers the read. Webhook handler is a new Nhost Function (~half a day, including idempotency keys for retries). **~1 day total.** |
| 4 | **Reverse-logistics pickup** (the QR-scan-on-doorstep flow) | A QR code is generated client-side from the `return_request_id`. There's no real courier integration; status flips to `pickup_scheduled` then to `in_transit` via an admin button. | Integrate Shiprocket or Delhivery's pickup API. POST a pickup request with the parent's address, get back a courier reference + tracking ID. Webhook on pickup-completion advances the status. | New Nhost Function `bookPickup` calling Shiprocket's REST API + a webhook handler. Status state machine doesn't change. **~2 days for one provider.** |
| 5 | **NGO-side delivery confirmation + impact updates** | Admin clicks a "Mark delivered" button to set `donation_records.delivered_to_ngo_at`. The "now used at Anganwadi 12" message is a hardcoded demo message. | Per-NGO integration. Some have a portal API (Goonj has one, Smile Foundation does not). Otherwise: weekly email reconciliation with the partner, manual data entry into a small ops tool. | Per-NGO. **1–2 weeks per partner**, sometimes more if the NGO is offline-first (Anganwadi network — paper logs, manual sync). This is honest project work, not engineering — ops headcount belongs in the budget. |
| 6 | **Impact certificate generation** | Server-side SVG → PNG renderer with parent name, NGO logo, item, date. Saved to Nhost Storage. The URL goes into `donation_records.impact_certificate_url`. | Same pipeline. Already real. | **No work.** This is one of the few things that's actually production-grade in the demo. |
| 7 | **Push notifications** ("your QC is approved!") | In-app toast banner only. Nothing if the app is closed. | Expo Push Notifications → APNs/FCM. Triggered from Nhost Functions on key state transitions (`qc_passed`, `pickup_scheduled`, `credit_added`). | Set up Expo project credentials, register device tokens on sign-in, add a `sendPushNotification` helper to `functions/_lib/`. **~1 day end-to-end including iOS provisioning.** |
| 8 | **Email** (welcome, donation receipt, credit transfer notice) | Nhost Auth's built-in email-on-signup is on; everything else is `console.log`'d to the Function log. | SendGrid or AWS SES. Templates in `nhost/emails/`. | **~2 hours.** Nhost has first-class SES integration via env vars. Templates are mostly written. |
| 9 | **Auth — email verification** | Nhost dev mode auto-confirms accounts. Sign-up gives an immediate JWT. | Toggle email verification on in `nhost.toml` (`auth.email.signin.required = true`). User clicks link in email before getting a session. | **One config line.** Already supported by Nhost. |
| 10 | **Refurb resale checkout** ("Buy this Renewed FlexDesk") | The Shop tab's Renewed segment shows the listing, but tapping "Buy" pops a "Demo only" alert. | The Shopify GID stored in `refurb_listings.shopify_renewed_product_id` is a real product on `miniture.in`. Tapping Buy deep-links to the Shopify product page. Checkout is Shopify's normal checkout — same cart, same payment, same brand. | **No work** once the connector swap (#1) is live. The product GID is already the real handle. The deep link is a one-liner. |
| 11 | **Credit transfer to a phone number** (Aunty sends ₹500 to a niece's parent) | Looks up the recipient by phone in `accounts.phone`. If no match, shows "Not on Miniture yet — invite them." (The invite is a fake share-sheet.) | Same lookup. The "invite" sends a real SMS via Twilio or MSG91 with an install link + a referral code. The credit lands in escrow until claimed. | **~3 days.** Twilio integration + an `escrow_credit_pending` table + claim flow on signup with the referral code. |
| 12 | **Trade-in credit expiry enforcement** (12 months → expired) | The `expires_at` column is set on insert. Nothing currently sweeps expired credit; balance reads ignore expiry. | A daily Nhost scheduled Function inserts a negative ledger row (`source_type = 'expiry'`) for each credit older than its `expires_at`. Balance reads just SUM as before. | **~half a day.** Nhost cron + one Function. |
| 13 | **Credit redemption at Shopify checkout** | The credit balance is shown in-app, but Shopify checkout doesn't see it. | Shopify Functions (the new programmable checkout extension) read the customer's metafield `miniture_credit_inr` and deduct from the order subtotal. The `miniture_credit_inr` metafield is updated via the connector when credit changes. | **~1 week.** Shopify Functions are well-documented. The metafield sync is straightforward; the checkout extension is Shopify-side TypeScript. This is the only item on this list with real engineering depth. |
| 14 | **QC photo storage retention** | Photos sit in Nhost Storage indefinitely. | After return is `completed`, photos older than 90 days are scheduled for deletion (legal/privacy hygiene). Keep one thumbnail per assessment for audit. | **~1 day.** Scheduled Nhost Function + a `scheduled_for_deletion_at` column on `assessment_photos`. |
| 15 | **Admin actions audit log** (who approved what, when) | `return_request_events.actor_account_id` is recorded, but there's no separate dashboard for "show me everything ops_user_X did this week." | Build the page. Same data, different query. | **~half a day.** Pure UI. |

## Summary

**Already production-grade in the demo:**
- Data model + Hasura permissions
- App auth wiring + JWT-claims-to-roles
- Photo upload + storage
- Append-only credit ledger
- Event-sourced status timeline
- The Shopify Admin GraphQL queries (the file just needs `fetch` uncommented)
- Impact certificate rendering

**One config flag away (≤1 day):**
- Real Shopify writes (#1, #2)
- Customer order ingestion (#3)
- Email delivery (#8)
- Auth email verification (#9)
- Renewed checkout deep-linking (#10)
- Trade-in expiry sweep (#12)
- Photo retention (#14)
- Admin audit dashboard (#15)

**A week or two of real work:**
- Reverse-logistics pickup integration (#4)
- Push notifications end-to-end with iOS provisioning (#7)
- Credit transfer with SMS invite + escrow (#11)
- Shopify checkout extension for credit redemption (#13)

**Genuinely hard, not-a-software-problem:**
- NGO-side delivery + impact reporting (#5) — ops headcount, partner relationships, sometimes paper logs
- Refurb labor SOPs and cost-per-grade — outside this prototype's scope, where Miniture would actually invest

**The honest summary:** if Miniture wanted to ship this to production, the software side is roughly two-engineer-weeks of integration work. The real investment is reverse logistics and refurb operations. Pitch Miniture on that conversation, not on the code.
