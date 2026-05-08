# Screen inventory

Final list of consumer-side screens delivered. Group routes are in
parentheses; dynamic segments are `[param]`. Routes not prefixed with `/`
are nested under the dynamic segment of the same group.

## Auth (signed-out gate)

| Route | File | One-liner |
|---|---|---|
| `/sign-in` | `app/app/(auth)/sign-in.tsx` | Email + password sign-in with demo-account hint card. |
| `/sign-up` | `app/app/(auth)/sign-up.tsx` | Email + password registration; calls `sync-account-from-auth` Function on success. |

## Tabs (signed-in)

| Route | File | One-liner |
|---|---|---|
| `/` (Home) | `app/app/(tabs)/index.tsx` | Existing AI greeting placeholder; not in this lane. |
| `/activities` | `app/app/(tabs)/activities.tsx` | Existing scaffold; not modified. |
| `/playlist` | `app/app/(tabs)/playlist.tsx` | Existing scaffold; not modified. |
| `/shop` | `app/app/(tabs)/shop.tsx` | Best Sellers grid + horizontal Renewed (refurb) collection. |
| `/profile` | `app/app/(tabs)/profile.tsx` | Real user data, credit pill, owned-count, sign-out button. |

## My Products (return entry point)

| Route | File | One-liner |
|---|---|---|
| `/my-products` | `app/app/my-products/index.tsx` | Grid of items the parent owns; tap into detail. |
| `/my-products/[id]` | `app/app/my-products/[id].tsx` | Hero + description + "Send back / Donate / Trade-in" CTA. |

## Return flow (multi-step, shared in-memory state)

| Route | File | One-liner |
|---|---|---|
| `/return/[id]/intro` | `app/app/return/[id]/intro.tsx` | Three-step explainer + Continue. |
| `/return/[id]/photos` | `app/app/return/[id]/photos.tsx` | Three guided camera prompts (front, damage, all parts). |
| `/return/[id]/grade` | `app/app/return/[id]/grade.tsx` | Self-declared condition: Good / Fair / Worn. |
| `/return/[id]/paths` | `app/app/return/[id]/paths.tsx` | Three path cards with computed payouts; recommended ribbon. |
| `/return/[id]/confirm` | `app/app/return/[id]/confirm.tsx` | Pickup slot selection + submit (Function with mutation fallback). |
| `/return/[id]/success` | `app/app/return/[id]/success.tsx` | Stylized QR code + "Track this return" / "Done". |
| `/return/[id]/track` | `app/app/return/[id]/track.tsx` | Live `useSubscription` timeline of `return_request_events`. |

## Credit

| Route | File | One-liner |
|---|---|---|
| `/credit` | `app/app/credit/index.tsx` | Orange hero balance card + recent ledger rows + Send credit CTA. |
| `/credit/transfer` | `app/app/credit/transfer.tsx` | Recipient phone + amount + message; Function with Hasura fallback. |

## Auth gate

`(tabs)/_layout.tsx` redirects unauthenticated users to `/sign-in`. The
existing root `_layout.tsx` was not modified.
