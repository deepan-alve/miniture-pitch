# Agent context — Miniture Buyback project

You're picking up a project mid-build. **Read this entire file before doing anything.** It explains the goal, the stack, what's already done, and what you specifically need to build.

## What this project is

A pitch demo for an internship at **Miniture** (https://miniture.in) — an Indian Montessori products company. The demo is a **buyback / circular-economy feature** that bolts onto their existing app: parents return outgrown products and choose one of three paths:

1. **Refurb** → Miniture cleans + relists in a "Renewed" collection, parent gets store credit
2. **Trade-in** → same physical pipeline as refurb but credit is bonus-multiplied and locked to next purchase (so it brings them back)
3. **Donate** → goes to an NGO, parent gets an impact certificate + small "thank-you" discount code (not full credit — would break unit economics)

The pitch is **not "rebuild your app"** — it's **"add the missing seller loop, integrate with what you already have"**. Their existing storefront is Shopify; the buyback feature integrates via a clean **ShopifyConnector** boundary that's stubbed for the demo and production-ready in the skeleton.

## Stack

- **Backend**: Nhost cloud project (Postgres + Hasura GraphQL + Auth + Storage + Functions). Cloud subdomain: `ntytiuebfzzodrotraun`, region `ap-south-1`.
- **App**: Expo (SDK 54, React Native 0.81), Expo Router, TypeScript. Lives in `app/`.
- **Auth**: Nhost Auth (JWT). Wired up in `app/lib/nhost.ts` + `app/providers/index.tsx`.
- **Data**: Apollo Client to Hasura. Wired in `app/lib/apollo.ts`. Subscriptions over WS already configured.
- **Shopify**: stubbed via `backend/shopify/` connector that mirrors the real Admin API. Demo writes to `shopify_stub_*` Postgres tables; production swap is a one-config-line change.

## What's already done

- ✅ Data model in `nhost/migrations/default/` (applied to cloud) — see `docs/data-model.md` and `docs/er-diagram.md`
- ✅ All 21 tables + 2 views tracked in Hasura with 38 FK relationships
- ✅ Demo data seeded: 15 real Miniture products, 3 demo accounts (Josh's Parent, Maya's Mom, Ops Admin), 3 NGO partners
- ✅ Shopify connector + stub + production skeleton in `backend/shopify/` — see its README
- ✅ Expo app scaffolding with Miniture-matched theme tokens (`app/constants/theme.ts`)
- ✅ 5-tab navigation skeleton (Activities / Playlist / Home / Shop / Profile) in `app/app/(tabs)/`
- ✅ Auth + Apollo providers wired at root layout (`app/app/_layout.tsx`)

## What's NOT done — the work

Each parallel agent owns a specific lane. Stay strictly in your lane. Read the other lanes only to understand contracts; don't write outside your lane.

| Lane | Owner | Files |
|---|---|---|
| 1. Backend (permissions + Functions) | Backend agent | `nhost/metadata/**`, `functions/**`, scripts |
| 2. Auth + consumer screens | App-consumer agent | `app/app/(auth)/**`, `app/app/my-products*`, `app/app/return/**`, `app/app/credit/**`, `app/app/(tabs)/shop.tsx`, `app/app/(tabs)/profile.tsx`, `app/components/**`, `app/graphql/operations/**` (consumer ops) |
| 3. Admin dashboard | App-admin agent | `app/app/(admin)/**`, admin-specific components |
| 4. Pitch artifacts | Pitch agent | `README.md`, `docs/architecture.md`, `docs/demo-script.md`, `docs/whats-faked.md`, `docs/pitch-narrative.md` |

## Visual style — non-negotiable

The app must feel like Miniture's own app. Their style:

- Background: warm cream `#FAF6F0` (`Palette.bg`)
- Primary accent: orange `#E8722C` (`Palette.orange`)
- Pastel category surfaces: yellow / blue / green / peach / pink / lavender (use `PastelDeck` array)
- Generous rounded shapes (`Radius.card = 20`, `Radius.cardLg = 28`, `Radius.pill = 999`)
- Friendly sans-serif (system font stack)
- Black segmented controls for active state
- Tag pills with colored dot prefix

**Always use `Palette`, `Spacing`, `Radius`, `Typography`, `Shadows` from `app/constants/theme.ts`. Never hardcode hex values or pixel sizes.**

## Architectural rules

1. **The connector boundary is sacred.** Anything that *would* be a Shopify call goes through `getShopifyConnector()` from `backend/shopify`. Never call Shopify-shaped operations from anywhere else.
2. **Append-only ledger for credits.** Never UPDATE `store_credit_ledger` rows. Always INSERT. Balance = `SUM(amount_inr)`.
3. **State changes flow through events.** When a `return_requests.status` changes, also INSERT a `return_request_events` row. Subscribers use this for the live timeline.
4. **No raw admin secret in app code.** The app uses JWT-auth only. Admin secret is for server-side / CLI work (in `.cloud-admin-secret`).
5. **Don't break existing files.** If you need to modify `app/app/_layout.tsx`, `app/constants/theme.ts`, or anything in `backend/shopify/`, propose the change in a comment and don't actually modify unless your lane explicitly owns it.

## Cloud endpoints (memorize)

```
GraphQL HTTP : https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/graphql
GraphQL WS   : wss://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/graphql
Auth         : https://ntytiuebfzzodrotraun.auth.ap-south-1.nhost.run/v1
Storage      : https://ntytiuebfzzodrotraun.storage.ap-south-1.nhost.run/v1
Functions    : https://ntytiuebfzzodrotraun.functions.ap-south-1.nhost.run/v1
Metadata     : https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/metadata  (admin only)
```

Admin secret for the metadata API: `set -a; source .cloud-admin-secret; set +a` then `$GENERATED_SECRET`.

## Network: route through SOCKS5 proxy

The dev machine sits behind a Fortinet TLS-inspecting middlebox that breaks direct HTTPS to Nhost. A shadowsocks SOCKS5 proxy is running at **`127.0.0.1:1080`**. **Every tool you run that calls the cloud must go through it.** Verify with:

```bash
curl --max-time 8 --socks5-hostname 127.0.0.1:1080 -sS -o /dev/null -w '%{http_code}\n' https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/version
# expect: 200
```

How to route different tools:

- **curl**: `curl --socks5-hostname 127.0.0.1:1080 ...`
- **Python (urllib/requests)**: set `ALL_PROXY=socks5h://127.0.0.1:1080` in env, OR shell out to curl. urllib doesn't natively support SOCKS5 — easiest is to use `curl` via subprocess. If you need pure Python, install `PySocks` and monkey-patch socket.
- **Generic tools that read env**: `export ALL_PROXY=socks5h://127.0.0.1:1080` (also `export HTTPS_PROXY=$ALL_PROXY HTTP_PROXY=$ALL_PROXY`).
- **node**: doesn't natively respect ALL_PROXY for fetch. If you need Node-side calls during dev, use `socks-proxy-agent` or just run a Python/curl script instead.

**Do NOT touch the VPN systemd service** (`vpn-toggle`). Just use the proxy port.

## How auth maps to demo accounts

The seed accounts have placeholder `auth_user_id` UUIDs (e.g. `bbbbbbbb-7777-0000-0000-000000000001`). When a real user signs up via Nhost Auth, a fresh `auth.users` row is created with a different UUID.

To make seed data "light up" for demo users, the **backend agent** writes a `syncAccountFromAuth` Function (or a one-shot seed-time Admin script) that, on signup with a known demo email (e.g. `josh.parent@miniture.demo`), updates the matching `accounts.auth_user_id` to the new auth user's ID. Three demo emails:

- `josh.parent@miniture.demo` → Josh's Parent account
- `maya.mom@miniture.demo` → Maya's Mom account
- `ops@miniture.demo` → Ops Admin (role: ops)

## Demo flow the whole thing must support

1. Sign up `josh.parent@miniture.demo` → app boots into Home tab
2. Tap Profile → My Products → see the 6 owned items from seed
3. Pick FlexDesk → "Return / Donate / Trade-in"
4. Photo capture (3 prompts: front, damage, all parts)
5. Path-choice screen showing all three options with ₹ values side-by-side
6. Pick refurb → schedule pickup → status: `submitted`
7. Switch to admin (sign in as `ops@miniture.demo`) → admin dashboard
8. See pending QC item → approve QC → click "approve"
9. **Live moment**: parent's phone shows status update via subscription, "₹X credit added"
10. Switch back to Shop → Renewed collection — the FlexDesk now appears with "Renewed" badge
11. Show transferable credit: parent gifts ₹500 to another account
12. Demo Maya's Mom: aged-out family → donate path is recommended → impact certificate generated

Every lane's work supports some slice of this. Coordinate by working off this flow.

## Definition of done (per lane)

- TypeScript typechecks (`cd app && npx tsc --noEmit`) — **must pass**
- Each screen visibly renders the right content
- Cloud queries actually work (test with a real GraphQL call before claiming done)
- README in your lane describes what you built and how to verify

## When you're stuck

- Check `docs/data-model.md` for table semantics
- Check `docs/cloud-config.md` for endpoints + how to talk to cloud
- Check `backend/shopify/README.md` for the integration boundary
- Read the conversation summary in your prompt — it has the strategic context (path economics, donation steering, transferable credit, etc.)
- Don't make up product names or prices — use what's in the seed (`nhost/seeds/default/0001_demo_data.sql`)

## Final reminder

This is for an internship pitch. Quality matters more than coverage. Ship one polished demo flow that actually works > ship six half-built screens. If you're running short on time, cut scope, document what you cut, ship what works.
