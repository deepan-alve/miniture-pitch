# Pitch narrative

The deck text. One section per slide. Punchy on purpose.

---

## 1. The opportunity

Miniture's strongest brand line is also its biggest unmonetized asset: **"lasts 15 years."** It's a real claim — the FlexDesk's spec sheet backs it. But here's the thing: most kids only need a Montessori desk for five years. Maybe seven. After that, the unit is sitting in the garage or quietly migrating to the back of a closet.

That's *ten years* of unused life, per unit, per household.

The parent has nowhere to send it. There's no resale market — too niche, too low-volume on OLX. There's no "store credit" path back to Miniture. There's no donation ritual that feels worth the friction. So the unit just sits there, and the parent's next purchase is from someone else, because Miniture is associated in their head with "the kid stage we already finished."

The buyback feature is the missing back half of the customer relationship. Three doors out, all of them lead back to Miniture.

---

## 2. Three paths, three psychographies

The mistake would be to build one path. Different parents want very different things, and a single-path program leaves money and emotional value on the table.

**Refurb → store credit.** The parent who wants flexible, transferable value. They might use it themselves, gift it to a sister with a toddler, or save it for a birthday. Credit is liquid within the Miniture ecosystem and that's the whole point.

**Trade-in → bonus credit, locked.** The parent with a younger kid still in the catalog. They're coming back anyway — what trade-in does is structure that return. The 25% bonus is the carrot; the 12-month lockup is the lock-in. This is how you make a multi-kid family a retention story instead of a one-shot sale.

**Donate → impact certificate + thank-you discount.** The parent whose only kid has aged out of the Montessori catalog. They will not redeem credit. They will not buy again. But they will give the desk for free if you make it feel meaningful — and they will tell other parents about it. That telling is the referral mechanic. The 15% off code is for the off-chance grandkid purchase, and the impact certificate is the artifact they post on Instagram.

**Single program, three product surfaces.** Same physical pipeline (pickup → QC → refurb labor for refurb/trade-in, or NGO handoff for donate). Different financial mechanics, different emotional contracts, different parents.

---

## 3. Unit economics overview

This isn't a feel-good program. Each path makes Miniture money — or it doesn't ship.

**Refurb.** Customer paid ₹15,499 for a FlexDesk new. We give them ₹6,200 in credit (≈40% of original). We refurb at ~₹400 in labor + parts. We list at ₹9,300 (60% of new) and someone else buys it. Revenue per unit: ₹9,300 incoming, ₹6,200 in credit issued (most of which is redeemed against high-margin new product), ~₹400 cost. **Margin per refurb unit: roughly the margin on a new sale at half the cost-of-goods.**

**Trade-in.** Same physical pipeline as refurb, but the parent gets a 25% bonus on credit (₹7,750 instead of ₹6,200) — and that credit can *only* be used on their next order, within 12 months. Higher payout per unit, but the redemption is guaranteed against a new-product purchase. The lockup eliminates the breakage downside.

**Donate.** Refurb labor is paid by Miniture (this is the cost). The unit goes to an NGO partner — Miniture absorbs the logistics. In return, the parent gets an impact certificate and a 15% discount code. Direct financial outcome: Miniture loses ₹400 in labor + ~₹100 in shipping. Indirect: brand equity, referrals, social reach, and a slim chance of the discount code triggering a grandparent purchase. **Treat donate as a marketing line item, not a P&L line item.**

The right comparison isn't "is buyback profitable in isolation." The right comparison is **lifetime value with vs. without the buyback program**. Every aged-out family without buyback is a churned customer. Every aged-out family that donates is a referrer. Every multi-kid family with trade-in is a retention you didn't have to pay CAC for again.

---

## 4. Why store credit, not cash refund

Three reasons, in plain terms.

**Customers stay in the ecosystem.** Cash refund creates a choice between Miniture and "no credit at all." Store credit creates a choice between Miniture and a competitor's catalog — and the parent has already trusted Miniture once. The competitor has to win again from zero.

**Breakage is profit.** A non-trivial fraction of issued store credit will never be redeemed. Industry numbers vary; a reasonable assumption is 15–25%. That's pure margin on something we already accounted for as an expense.

**No payment-processor fees.** Cash refunds cost 2–3% to the card network. Credit issuance costs nothing.

There's also a defensive reason: cash refunds invite return abuse and arbitrage. Store credit doesn't.

The only place to *not* offer credit is the donate path — and that's by design.

---

## 5. Why donate is feel-good only, not full credit

If the donate path paid the same credit as refurb, **every parent would pick donate every time.**

Lower friction. No QC anxiety. The parent doesn't care if it gets graded down. The unit goes "somewhere good" instead of through Miniture's process. They get the rupees and the warm feeling.

That collapses the program economically and operationally. Donate stops being a self-sorting mechanism and becomes the default — which means refurb's role (creating Renewed inventory) starves, and trade-in's role (locking multi-kid families in) collapses into refurb.

The right design is: **donate is the path you choose when you genuinely don't want the credit.** Aged-out families. Parents whose kids are off to high school and Montessori is a closed chapter. The 15% discount code on a future order is a thank-you, not a payout. That delta — the difference between credit value and 15% off — is what makes the path serve a different segment instead of cannibalizing the others.

This also preserves the donation's purity. A donation that comes with a payout isn't a donation — it's a sale. A donation with a thank-you is the real thing, and it's what the impact certificate is honoring.

---

## 6. Transferable credit — the killer feature for aged-out families

Refurb credit can be sent to another parent's account.

Why this matters: it solves the "stuck credit" problem for aged-out single-kid families who chose refurb instead of donate (some will). They get credit they don't personally want to redeem. With transferability, they can send it to a sister with toddlers, a friend with a new baby, a colleague's housewarming. That's a use they're enthusiastic about.

What that does for Miniture:

- **Doubles as a referral mechanic.** Every credit transfer is a free customer acquisition. The recipient is a new account on Miniture, redeeming credit that's already on the books.
- **Removes the only argument against refurb credit** ("but my kid doesn't need anything").
- **Builds a small social graph inside the app.** Phone-number-based recipient lookup, with an SMS invite if they're not on Miniture yet. (See `docs/whats-faked.md` row 11 for the production wiring — escrow on unclaimed credit, claim flow on signup.)

The transferred credit is still bound by the source's rules: refurb credit doesn't expire, trade-in credit retains its 12-month lockup, donate's 15% code is single-account-only (it's a thank-you, not a transferable asset).

---

## 7. The honest hard parts

Pitches lose credibility when they paper over the hard things. Here's the honest list.

**Reverse logistics is the real cost.** Software is the easy part. Pickup at the parent's address, receiving at the warehouse, refurb labor (cleaning, replacing missing parts, repackaging), QC, photography for the Renewed listing — all of that is per-unit cost in labor and partnership. Shiprocket or Delhivery for pickup is two days of integration; the operational SOPs for refurb are weeks of design. Where Miniture would actually invest is here, not in the app.

**80G tax receipts don't apply.** Indian tax law does not allow Section 80G deductions for in-kind goods donations — only cash donations to qualifying entities. We use the language **"impact certificate"**, not **"tax receipt"**, and we don't pretend otherwise. Reviewers who know Indian tax law will respect this. The v2 of the donate path could be a "convert-and-donate" flow where the parent's credit is converted to cash and donated to an 80G-qualifying NGO, which *would* be deductible — but that's a different feature, with different unit economics, and shouldn't be confused with the in-kind path.

**Unit economics depend on a minimum item value.** A ₹5,000 desk is worth refurbishing and reshipping. A ₹1,299 water pump dispenser is not. The program needs a price gate — likely **items with `original_price >= ₹2,000`** are eligible for refurb/trade-in. Items below that go straight to donate (where labor cost is the same low number) or are recycled. The exact threshold is something Miniture's ops team would tune by category, not something to hardcode at launch.

**Fraud is real but tractable.** Self-declared grade is gated by photos. QC at intake catches the worst abuses. Pattern detection — "this account has submitted six returns in a month" — is straightforward to add later. For the first thousand returns, generous defaults beat lost trust. Don't optimize for the worst-case parent before you have customers.

---

## 8. The architectural play — extend, don't replace

We're not asking Miniture to rip out their Shopify storefront. We're not building a parallel cart. We're not proxying checkout.

What we're doing: **adding the missing seller loop as a new service that integrates with Shopify through one well-defined seam.**

That seam is `backend/shopify/ShopifyConnector` — an interface with eight methods. Three demo modes for it:

1. **Today (stub):** the connector writes to local Postgres tables (`shopify_stub_*`) and returns Shopify-shaped responses. The rest of the app doesn't know it's faked.
2. **Production:** the connector calls Shopify's Admin GraphQL API. The queries are already written and live in `backend/shopify/ShopifyClient.ts` — they're real, not pseudocode. Activation is one config flag.
3. **The receive side:** Shopify's webhooks (`orders/create`, `products/update`) hit Nhost Function endpoints directly. The webhook handlers write to our domain tables — no connector needed for inbound.

This means **the Renewed collection lives on `miniture.in`**. Same domain, same checkout, same brand trust, same SEO. We don't host product pages, we don't take payments, we don't replace anything. We add inventory to your existing storefront and we add a seller-side workflow your existing storefront doesn't have.

For Miniture's engineering team, the integration is small and obvious: one Shopify custom app for the Admin token, one webhook configuration, one Renewed collection. For Miniture's brand team, there's no migration anxiety and no double-stack confusion.

---

## 9. What this prototype proves — and what would still need to be built

**What's proven:**

- The data model can sustain real volume. 21 tables, append-only ledger, event-sourced state machine. This is the same shape a production buyback system would have.
- The integration boundary works. The connector swap from `ShopifyStub` to `ShopifyClient` is genuinely a one-line diff. The Admin GraphQL queries are the real ones.
- The UX is thought through. Three paths, three segments, age-based recommendation, transferable credit, photo-gated grading. These aren't UI flourishes — they're the product.
- The technical foundation can ship. Nhost cloud is production-grade. Apollo subscriptions for the live moment. JWT-claim-to-Hasura-role for permissions. None of this is research code.

**What would still need to be built (in priority order):**

1. **Reverse logistics integration** — Shiprocket or Delhivery. Two days. Without this, every pickup is a manual phone call.
2. **Refurb operations SOPs** — not software. Process design with ops team. Weeks of design + iteration. The biggest investment in the program.
3. **Shopify checkout credit redemption** — Shopify Functions extension. ~1 week. Without this, store credit is shown in-app but doesn't apply at checkout.
4. **Push notifications** — 1 day. Lifts engagement on key transitions (QC approved, credit added).
5. **NGO partner integrations or ops tooling** — per partner, 1–2 weeks each. Some have APIs, most don't. This is partnership work, not engineering.

**What I'd love to discuss with the team** (if I'm coming on board):

- Pricing strategy for the Renewed collection — fixed % off vs. dynamic by demand.
- Whether trade-in's lockup window should vary by item category (a desk is a 5-year purchase, an art kit is a 1-year purchase).
- The minimum item value threshold by category.
- How to surface the program at the *purchase* stage, not just post-purchase — "buy this knowing you'll get ₹X back when you're done" is a different conversion message.

The prototype is the start of that conversation. The hardest parts of this program aren't software, and the most interesting product decisions haven't been made yet.

---

*Built by Deepan, May 2026, as a pitch for an internship at Miniture.*
