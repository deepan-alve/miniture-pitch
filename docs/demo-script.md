# Demo script

A 5–7 minute walkthrough for an in-person pitch. Two devices ideally — a phone running the parent app, a laptop or second phone running the admin dashboard. If only one device, swap accounts mid-demo.

Each beat has three parts:

- **Action** — what to click / type
- **Say** — the line out loud
- **Reviewer should think** — the takeaway you want them landing on

If something glitches, recover with the **Backup** note. Don't apologize. Move on.

---

## Pre-demo checklist (do this 5 minutes before)

- [ ] Phone on the same Wi-Fi as the laptop running `npx expo start`.
- [ ] Phone has Expo Go installed and is signed in.
- [ ] Test that the cloud is alive: `curl --max-time 8 --socks5-hostname 127.0.0.1:1080 -sS https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/version` → expect 200.
- [ ] Test the WS subscription: open the app, sign in, leave it on My Products. You should see seeded items load.
- [ ] Reset Josh's Parent's account state: no open `return_requests` for `ffffffff-0001-0000-0000-000000000001` (FlexDesk). If there's leftover state from a prior run, run the reset script: `bash scripts/reset-demo.sh josh`.
- [ ] Have `backend/shopify/ShopifyClient.ts` open in a tab on the laptop, scrolled to the `PRODUCT_CREATE_MUTATION` constant. You'll show this at minute 5:30.
- [ ] Mute Slack, mute the laptop, full-screen the relevant windows.

---

## Minute 0:00 — Setup (15 seconds)

**Action.** App is open on the phone, on the sign-in screen.

**Say.** "I'll show you a buyback feature for Miniture. Three paths, three parent segments. Five minutes."

**Reviewer should think.** *Concise. Knows what they're showing.*

---

## Minute 0:15 — The hook (30 seconds)

**Action.** Don't tap anything yet. Hold the phone up.

**Say.** "Miniture markets your products as 'lasts 15 years.' Honest claim — I checked the FlexDesk specs. But most kids only need a desk for five years. That's ten years of unused life every parent has sitting in their house, with no path back. So what we built is the seller loop — three paths a parent can take when their kid outgrows something. Refurb for credit, trade-in for bonus credit, or donate for an impact certificate."

**Reviewer should think.** *They understand our brand promise and they spotted the gap. Good.*

**Backup.** If they interrupt with "we already considered something like this" — answer "right, the question is the integration shape — that's what I want to show you."

---

## Minute 0:45 — Sign in (20 seconds)

**Action.** Type `josh.parent@miniture.demo` / `Demo1234`. Tap **Sign in**.

**Reviewer should see.** The Home tab loads — friendly cream background, orange accents. Looks like Miniture's app, not a generic CRUD demo.

**Say.** "Josh's Parent is one of three demo accounts. Multi-kid family — Josh is three, Anya is one. They've bought a fair amount."

**Reviewer should think.** *This visually fits with our brand. They paid attention to the design.*

**Backup.** If sign-in fails: the Auth service is occasionally slow on cold start. Wait one beat, retap. If it still fails, mention "JWT cold start, give me a second" — never apologize for the platform.

---

## Minute 1:05 — My Products lights up (40 seconds)

**Action.** Tap **Profile** tab → **My Products**.

**Reviewer should see.** Six owned items render — FlexDesk 6-in-1, Push Cart, Step Stool, Art Kit, Water Pump, Activity Tray. Each card shows the product image, the title, and how long they've owned it.

**Say.** "Every line item on every fulfilled order expands into one row in `owned_units`. That's the table that drives this view. It's per-unit, not per-line-item — if a parent buys two of something they might return one and keep the other. Per-unit tracking is the gate that makes the rest of the feature work."

**Reviewer should think.** *They thought about the data model. This isn't a UI demo with a fake JSON file behind it.*

---

## Minute 1:45 — Start a return (30 seconds)

**Action.** Tap the **FlexDesk 6-in-1**. On the product detail screen, tap **Return / Donate / Trade-in**.

**Reviewer should see.** A four-step flow header at the top: Photos → Grade → Path → Pickup. Currently on Photos.

**Say.** "We ask for three photos: front of the item, any visible damage, and all parts laid out. This is what the QC team will see before the unit physically arrives — it's the same workflow the Apple Refurbished program uses."

**Reviewer should think.** *Smart reference. Not over-engineered.*

---

## Minute 2:15 — Photo capture (45 seconds)

**Action.** Tap the first prompt ("Front view") → camera opens → snap a photo of literally anything (a coffee cup, the table) → confirm. Repeat for "Damage" and "All parts." Each prompt re-uses the same camera flow.

**Reviewer should see.** Each captured photo previews as a thumbnail under its prompt. After all three, **Continue** lights up.

**Say.** "Photos go to Nhost Storage with a JWT — gated by the same auth as the rest of the app. The storage paths get recorded against a `condition_assessment` row, phase `self_declared`. When the unit arrives, ops creates a second assessment, phase `qc_verified`, with their own grade. We compare them and either approve the parent's grade, downgrade with consent, or fail the unit."

**Reviewer should think.** *Two-sided assessment. They've thought about the disagreement case.*

**Backup.** If the camera permission prompt blocks the flow — tap allow, retake. If image upload is slow, narrate: "uploading to Nhost Storage now."

---

## Minute 3:00 — Self-grade (20 seconds)

**Action.** Tap **Continue**. On the Grade screen, pick **Good**.

**Reviewer should see.** Three options: Good, Fair, Worn — with one-line descriptions of each.

**Say.** "Self-declared grade. Sets expectations for the credit they'll get, which we show them on the next screen."

---

## Minute 3:20 — The path screen — the value prop slide (60 seconds)

**Action.** Tap **Continue** → Path screen loads.

**Reviewer should see.** Three large cards side by side, each with the rupee value prominent:

- **Refurb** — ₹X store credit. "Apple Refurbished, but for Montessori."
- **Trade-in** — ₹Y bonus credit. "+25% boost. Locked to your next purchase within 12 months."
- **Donate** — Impact certificate + 15% off code. "Your unit teaches a kid in an Anganwadi."

**Pause here.** This is the slide.

**Say.** "Three paths because they serve three different parents. Multi-kid families want trade-in — they're coming back anyway, lock me in. Aged-out single-kid families won't redeem credit, so we don't try to give them credit — we give them the donation and the warm feeling. Parents who want flexible value take refurb credit, which they can transfer to anyone — sister, friend, whoever."

**Reviewer should think.** *They've segmented the customer. The product structure follows the segmentation.*

---

## Minute 4:20 — Pick refurb, schedule pickup (30 seconds)

**Action.** Tap **Refurb**. → The Pickup screen loads with the parent's default address pre-filled. Tap **Tomorrow morning, 10–12 AM**. Tap **Confirm**.

**Reviewer should see.** A success screen: a QR code with the request ID, a status pill saying **Submitted**, and a small "Track this return" link.

**Say.** "QR is what the courier scans on pickup. Status is `submitted` and there's a row in `return_request_events` with the timestamp. Now I switch to the ops side."

---

## Minute 4:50 — Switch to admin (30 seconds)

**Action.** On the laptop / second device, sign in as `ops@miniture.demo` / `Demo1234`. Land on the admin dashboard's **Pending QC** tab.

**Reviewer should see.** A table of pending returns. Josh's FlexDesk is at the top, with a thumbnail of the front photo, the self-declared grade (Good), and an **Open** button.

**Say.** "Ops's view. Same backend, role-gated by Hasura permissions — JWT claim says `ops` so they see all return requests but no parent payment data."

**Reviewer should think.** *They handled multi-tenant permissions properly.*

---

## Minute 5:20 — Approve QC — the live moment (30 seconds)

**Action.** Click **Open** on the FlexDesk row. The QC review screen shows all three photos and the self-declared grade. Click **Confirm grade: Good** → **Approve**.

**Reviewer should see.** On the laptop: a success toast. **At the same time**, on the phone (which is still on the success screen from earlier), a banner appears: **"₹7,245 credit added"** and the status pill flips from Submitted to Completed. (Math: ₹15,499 original × 0.55 grade-Good multiplier = ₹8,524 refurb price; parent gets 85% = ₹7,245. The 15% Miniture keeps as refurb-handling margin.)

**Pause here. Let it land.**

**Say.** "That's a Hasura subscription over WebSocket. Same as Slack uses. The parent didn't refresh — Hasura pushed the new ledger row to the phone."

**Reviewer should think.** *Live updates work. This isn't smoke and mirrors.*

**Backup.** If the subscription doesn't fire — and it might if the WS dropped — tap the My Returns tab to refresh and say: "transient — in production this is a transient WS reconnect issue solved with `wsLink.retry`. Same end state."

---

## Minute 5:50 — The connector — show the integration boundary (40 seconds)

**Action.** On the admin dashboard, click **Stub Log**. The most recent row is `createRenewedProduct` with a payload preview (title: "FlexDesk 6-in-1 — Renewed (good)", price: ₹8,524, condition tag: "good", collection: Renewed).

**Click the row to expand.** It shows the exact `ProductInput` that would be passed to Shopify's `productCreate` mutation.

**Then switch to your laptop's editor and show `backend/shopify/ShopifyClient.ts`** — scroll to the `PRODUCT_CREATE_MUTATION` constant.

**Say.** "In demo, that call writes to a Postgres table I labelled `shopify_stub_products`. In production, it goes to Shopify's Admin GraphQL API — that exact mutation is here. Real query, real shape, ready to ship. To activate, one config flag in `backend/shopify/index.ts` flips the factory from `ShopifyStub` to `ShopifyClient`. The app, Hasura, and the Functions are unchanged."

**Reviewer should think.** *Clean integration boundary. They could ship this.*

---

## Minute 6:30 — The Renewed listing on the parent side (20 seconds)

**Action.** Back on the phone, tap **Shop** tab → **Renewed** segment.

**Reviewer should see.** The FlexDesk 6-in-1 — Renewed appears at the top, with a **Renewed** pill, the discounted price, and a "Good condition" tag.

**Say.** "Same Shopify storefront. In production, the Renewed badge is just a Shopify collection on miniture.in. Same checkout, same cart, same brand."

**Reviewer should think.** *They didn't try to rebuild our store. They extended it.*

---

## Minute 6:50 — Bonus: Maya's Mom and the donate steer (45 seconds — only if time)

**Action.** Sign out. Sign in as `maya.mom@miniture.demo`. Go to My Products → tap the FlexDesk Super → Return.

**Reviewer should see.** When the path screen loads, the **Donate** card has a soft highlight and a small note: "Your kid Maya is 7 — likely outgrown. Consider donating."

**Say.** "Maya is seven. The age-recommendation engine notices her only kid is past the catalog's age range, so we surface donate first. The credit options are still there — never blocked — but we steer toward the path that fits this household."

**Action.** Tap **Donate** → pick **Smile Foundation** → confirm. Land on the success screen with the impact certificate preview and a 15% off code.

**Say.** "Important honesty: this is an impact certificate, not an 80G receipt. Indian tax law doesn't allow 80G deductions for in-kind goods donations — we don't pretend it does. The 15% discount is the thank-you, not a credit equivalent. If we paid credit on donate, every parent would pick donate and the unit economics would collapse."

**Reviewer should think.** *They know Indian tax law. They're not bullshitting.*

---

## Minute 7:35 — Wrap (15 seconds)

**Say.** "Five-line summary. The data model treats the credit ledger like a bank — append-only. State changes flow through events, so the audit log and timeline are free. The Shopify boundary is one file you can grep. And the demo we just ran is one config flag away from production. I'd love to talk about reverse logistics next — that's where the real cost is, and where you'd actually invest."

**Reviewer should think.** *They know what's stubbed and what isn't, and they're inviting the harder conversation.*

---

## Things to NOT say

- "It's just a demo." (It's a working system.)
- "I didn't have time to build X." (Frame stubs as scope decisions in `whats-faked.md`.)
- "This is rough." (It's not. Stand behind it.)
- "I think this could maybe..." (Confident voice. They want a teammate, not a hedger.)

## If they ask

| Question | One-line answer |
|---|---|
| "How long did this take?" | "About a week of focused build." |
| "Why Nhost?" | "Bundles Postgres, Hasura, Auth, Storage, Functions. Same architecture works for production at scale." |
| "What about reverse logistics cost?" | "That's the real cost — software is the easy part. Shiprocket's pickup API is two days of integration. Refurb labor is per-unit, ₹X for a desk, ₹Y for a chair. The program needs a minimum item value gate — probably ₹2,000 — to be worth running." |
| "What about fraud — fake returns?" | "Self-declared grade gated by photos. QC at intake. Pattern detection on serial returns per account. We'd dial up enforcement as volume grows; for the first thousand returns, generous defaults beat lost trust." |
| "Why three paths and not just two?" | Point them at the segmentation in `docs/pitch-narrative.md`. Multi-kid wants trade-in lock-in. Aged-out wants the donate exit. Refurb is the cash-equivalent path for everyone else. Three different parents, three product surfaces. |
| "Could this go live tomorrow?" | "Software-side: a week. Real cost is the reverse-logistics partnership and the refurb-labor SOPs. That's where Miniture would invest." |
