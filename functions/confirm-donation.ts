// POST /v1/confirm-donation   (ops/admin role required)
//
// Body:  { donation_record_id: uuid }
// Reply: {
//   donation_record_id,
//   impact_certificate_url,
//   discount_code,
//   discount_id
// }
//
// Steps:
//   1. UPDATE donation_records.delivered_to_ngo_at = now().
//   2. Generate impact certificate SVG (uses parent name, product, NGO).
//   3. Upload SVG to Nhost Storage at impact-certs/{donation_record_id}.svg.
//   4. UPDATE donation_records.impact_certificate_url.
//   5. Call ShopifyConnector.createDiscountCode (15% off, scoped to customer).
//   6. INSERT discount_codes mirror row.
//
// All side effects happen with the admin secret — the parent receives the
// new discount code via subscription on `discount_codes`.

import { hasuraAdmin, readSession } from './_lib/hasura';
import {
  renderImpactCertificate,
  uploadImpactCertificate,
} from './_lib/impact-cert';
import {
  donateDiscountExpiryIso,
  DONATE_THANK_YOU_DISCOUNT_PCT,
} from './_lib/pricing';
import { getShopifyConnector } from './_lib/shopify';

interface ReqBody {
  donation_record_id?: string;
}

export interface ConfirmDonationResult {
  donation_record_id: string;
  impact_certificate_url: string;
  discount_code: string;
  discount_id: string;
}

interface DonationContext {
  donation: { id: string; return_request_id: string };
  ngo: { id: string; name: string; logo_url: string | null };
  product: { title: string; hero_image_url: string | null };
  account: { id: string; display_name: string; shopify_customer_gid: string | null };
}

async function loadDonation(donationRecordId: string): Promise<DonationContext> {
  const data = await hasuraAdmin<{
    donation_records_by_pk:
      | {
          id: string;
          return_request_id: string;
          ngo_partner: { id: string; name: string; logo_url: string | null };
          return_request: {
            account: {
              id: string;
              display_name: string;
              shopify_customer_gid: string | null;
            };
            owned_unit: {
              product: { title: string; hero_image_url: string | null };
            };
          };
        }
      | null;
  }>(
    /* GraphQL */ `
      query LoadDon($id: uuid!) {
        donation_records_by_pk(id: $id) {
          id return_request_id
          ngo_partner { id name logo_url }
          return_request {
            account { id display_name shopify_customer_gid }
            owned_unit { product { title hero_image_url } }
          }
        }
      }
    `,
    { id: donationRecordId },
  );
  if (!data.donation_records_by_pk) throw new Error('donation_record not found');
  const d = data.donation_records_by_pk;
  return {
    donation: { id: d.id, return_request_id: d.return_request_id },
    ngo: d.ngo_partner,
    product: d.return_request.owned_unit.product,
    account: d.return_request.account,
  };
}

export async function confirmDonation(body: ReqBody): Promise<ConfirmDonationResult> {
  if (!body.donation_record_id) throw new Error('donation_record_id required');
  const ctx = await loadDonation(body.donation_record_id);

  // 1. Mark delivered.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation MarkDelivered($id: uuid!) {
        update_donation_records_by_pk(
          pk_columns: { id: $id }
          _set: { delivered_to_ngo_at: "now()" }
        ) { id }
      }
    `,
    { id: ctx.donation.id },
  );

  // 2 + 3. Build SVG and upload it. If the storage upload fails, fall back
  // to a data URL so the demo still produces *something* (and the admin can
  // fix storage perms separately).
  const svg = renderImpactCertificate({
    parentName: ctx.account.display_name,
    productTitle: ctx.product.title,
    productImageUrl: ctx.product.hero_image_url ?? undefined,
    ngoName: ctx.ngo.name,
    ngoLogoUrl: ctx.ngo.logo_url ?? undefined,
    dateIso: new Date().toISOString(),
    certificateId: ctx.donation.id,
  });

  let certificateUrl: string;
  try {
    const storageBase =
      process.env.NHOST_STORAGE_URL ??
      // Best-effort cloud guess if the env var isn't injected.
      'https://ntytiuebfzzodrotraun.storage.ap-south-1.nhost.run/v1';
    const adminSecret =
      process.env.NHOST_HASURA_ADMIN_SECRET ?? process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? '';
    certificateUrl = await uploadImpactCertificate({
      storageUrl: storageBase,
      adminSecret,
      donationRecordId: ctx.donation.id,
      svg,
    });
  } catch (e) {
    // Demo fallback — still useful as the URL field gets set and the admin
    // can `data:` decode the SVG inline. Logged via `payload` on the event.
    certificateUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // 4. Save the URL.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation SaveCertUrl($id: uuid!, $url: String!) {
        update_donation_records_by_pk(
          pk_columns: { id: $id }
          _set: { impact_certificate_url: $url }
        ) { id }
      }
    `,
    { id: ctx.donation.id, url: certificateUrl },
  );

  // 5. Create discount code via Shopify connector.
  const code = `THANKS-${ctx.donation.return_request_id.slice(0, 6).toUpperCase()}`;
  const endsAt = donateDiscountExpiryIso();
  const connector = getShopifyConnector();
  const dResp = await connector.createDiscountCode({
    code,
    percentageOff: DONATE_THANK_YOU_DISCOUNT_PCT,
    customerId: ctx.account.shopify_customer_gid ?? undefined,
    oncePerCustomer: true,
    endsAt,
  });
  if (!dResp.ok) throw new Error(`createDiscountCode failed: ${dResp.error.message}`);

  // 6. Mirror it into our discount_codes table.
  const ins = await hasuraAdmin<{
    insert_discount_codes_one: { id: string; code: string };
  }>(
    /* GraphQL */ `
      mutation MirrorDiscount(
        $account: uuid!
        $code: String!
        $pct: Int!
        $expires: timestamptz!
        $shopify_id: String!
        $source: uuid
      ) {
        insert_discount_codes_one(
          object: {
            account_id: $account
            code: $code
            discount_pct: $pct
            expires_at: $expires
            shopify_price_rule_id: $shopify_id
            source_donation_id: $source
          }
        ) { id code }
      }
    `,
    {
      account: ctx.account.id,
      code,
      pct: DONATE_THANK_YOU_DISCOUNT_PCT,
      expires: endsAt,
      shopify_id: dResp.data.id,
      source: ctx.donation.id,
    },
  );

  // Append a timeline event so the parent's app shows the reward.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation AddDonateEvent($rr: uuid!, $payload: jsonb!) {
        insert_return_request_events_one(
          object: {
            return_request_id: $rr
            event_type: "donation_confirmed"
            payload: $payload
          }
        ) { id }
      }
    `,
    {
      rr: ctx.donation.return_request_id,
      payload: {
        impact_certificate_url: certificateUrl,
        discount_code: code,
        discount_pct: DONATE_THANK_YOU_DISCOUNT_PCT,
        ngo_name: ctx.ngo.name,
      },
    },
  );

  return {
    donation_record_id: ctx.donation.id,
    impact_certificate_url: certificateUrl,
    discount_code: code,
    discount_id: ins.insert_discount_codes_one.id,
  };
}

export default async function handler(req: any, res: any) {
  try {
    const session = readSession(req);
    if (session.role !== 'ops' && session.role !== 'admin') {
      return res.status(403).json({ error: 'ops or admin role required' });
    }
    const result = await confirmDonation((req.body ?? {}) as ReqBody);
    res.status(200).json(result);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

export const __test = { confirmDonation, loadDonation };
