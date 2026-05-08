// POST /v1/approve-qc   (ops/admin role required)
//
// Body:
//   { return_request_id: uuid, verified_grade: 'good'|'fair'|'worn'|'unfit', notes?: string }
//
// Reply (varies by path):
//   refurb / trade_in:
//     {
//       status: 'qc_passed' | 'qc_downgraded',
//       refurb_listing_id, shopify_renewed_product_gid,
//       credit_amount_inr, ledger_id,
//       trade_in_credit_id?
//     }
//   donate:
//     {
//       status: 'completed',
//       donation_record_id
//     }
//
// Steps (refurb / trade_in):
//   1. Load the request + its owned_unit + product + account.
//   2. INSERT condition_assessments (phase='qc_verified').
//   3. UPDATE return_requests.status (qc_passed if same grade, qc_downgraded if not).
//   4. INSERT refurb_listings (sets condition_grade + listed_price_inr).
//   5. Call ShopifyConnector.createRenewedProduct() — get back GID.
//   6. UPDATE refurb_listings.shopify_renewed_product_id + listed_at.
//   7. INSERT store_credit_ledger row for the parent.
//   8. If trade_in: INSERT trade_in_credits.
//   9. UPDATE owned_units.status ('returned' or 'traded_in').
//  10. Append return_request_events for each transition.
//
// Steps (donate): see donate path branch — unit goes to status='donated',
//   donation_record created against the first active NGO. The discount-code
//   reward + impact certificate are deferred to confirm-donation (when the
//   NGO actually receives the goods).

import { hasuraAdmin, readSession } from './_lib/hasura';
import { priceForPath, type ConditionGrade } from './_lib/pricing';
import { getShopifyConnector } from './_lib/shopify';

interface ReqBody {
  return_request_id?: string;
  verified_grade?: ConditionGrade;
  notes?: string;
}

interface RequestContext {
  request: {
    id: string;
    path: 'refurb' | 'trade_in' | 'donate';
    status: string;
    self_declared_grade: ConditionGrade | null;
    account_id: string;
    owned_unit_id: string;
  };
  unit: { id: string; status: string };
  product: {
    id: string;
    title: string;
    description: string | null;
    price_inr: number;
    category: string | null;
    hero_image_url: string | null;
  };
  account: { id: string; display_name: string; shopify_customer_gid: string | null };
}

async function loadContext(returnRequestId: string): Promise<RequestContext> {
  const data = await hasuraAdmin<{
    return_requests_by_pk:
      | {
          id: string;
          path: 'refurb' | 'trade_in' | 'donate';
          status: string;
          self_declared_grade: ConditionGrade | null;
          account_id: string;
          owned_unit_id: string;
          owned_unit: {
            id: string;
            status: string;
            product: {
              id: string;
              title: string;
              description: string | null;
              price_inr: number;
              category: string | null;
              hero_image_url: string | null;
            };
          };
          account: { id: string; display_name: string; shopify_customer_gid: string | null };
        }
      | null;
  }>(
    /* GraphQL */ `
      query LoadCtx($id: uuid!) {
        return_requests_by_pk(id: $id) {
          id path status self_declared_grade account_id owned_unit_id
          owned_unit {
            id status
            product {
              id title description price_inr category hero_image_url
            }
          }
          account { id display_name shopify_customer_gid }
        }
      }
    `,
    { id: returnRequestId },
  );
  if (!data.return_requests_by_pk) throw new Error(`return_request ${returnRequestId} not found`);
  const r = data.return_requests_by_pk;
  return {
    request: {
      id: r.id,
      path: r.path,
      status: r.status,
      self_declared_grade: r.self_declared_grade,
      account_id: r.account_id,
      owned_unit_id: r.owned_unit_id,
    },
    unit: { id: r.owned_unit.id, status: r.owned_unit.status },
    product: r.owned_unit.product,
    account: r.account,
  };
}

async function appendEvent(
  rr: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await hasuraAdmin(
    /* GraphQL */ `
      mutation AddEvt($rr: uuid!, $type: String!, $payload: jsonb!) {
        insert_return_request_events_one(
          object: {
            return_request_id: $rr
            event_type: $type
            payload: $payload
          }
        ) { id }
      }
    `,
    { rr, type: eventType, payload },
  );
}

export interface ApproveQcResult {
  status: 'qc_passed' | 'qc_downgraded' | 'completed';
  refurb_listing_id?: string;
  shopify_renewed_product_gid?: string;
  credit_amount_inr?: number;
  ledger_id?: string;
  trade_in_credit_id?: string;
  donation_record_id?: string;
}

export async function approveQc(body: ReqBody): Promise<ApproveQcResult> {
  if (!body.return_request_id || !body.verified_grade) {
    throw new Error('return_request_id and verified_grade are required');
  }
  const ctx = await loadContext(body.return_request_id);

  // Always record the QC assessment first — the rest of the side effects
  // depend on it but we want it persisted even if downstream calls fail.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation InsertQc(
        $rr: uuid!
        $grade: condition_grade!
        $notes: String
      ) {
        insert_condition_assessments_one(
          object: {
            return_request_id: $rr
            phase: "qc_verified"
            grade: $grade
            notes: $notes
          }
          on_conflict: {
            constraint: condition_assessments_return_request_id_phase_key
            update_columns: [grade, notes]
          }
        ) { id }
      }
    `,
    {
      rr: ctx.request.id,
      grade: body.verified_grade,
      notes: body.notes ?? null,
    },
  );

  // Branch on path.
  if (ctx.request.path === 'donate') {
    return await runDonate(ctx);
  }

  return await runRefurbOrTradeIn(ctx, body.verified_grade);
}

// ---------------------------------------------------------------------------
// Refurb / trade-in path
// ---------------------------------------------------------------------------

async function runRefurbOrTradeIn(
  ctx: RequestContext,
  verifiedGrade: ConditionGrade,
): Promise<ApproveQcResult> {
  if (verifiedGrade === 'unfit') {
    // No listing, no credit — just close out the request.
    await hasuraAdmin(
      /* GraphQL */ `
        mutation FailQc($rr: uuid!, $unit: uuid!) {
          update_return_requests_by_pk(
            pk_columns: { id: $rr }
            _set: { status: "qc_failed" }
          ) { id status }
          update_owned_units_by_pk(
            pk_columns: { id: $unit }
            _set: { status: "returned", returned_at: "now()" }
          ) { id status }
        }
      `,
      { rr: ctx.request.id, unit: ctx.unit.id },
    );
    await appendEvent(ctx.request.id, 'qc_failed', { verifiedGrade });
    return { status: 'qc_passed' as const };
  }

  const path = ctx.request.path as 'refurb' | 'trade_in';
  const pricing = priceForPath(path, ctx.product.price_inr, verifiedGrade);
  const downgraded =
    ctx.request.self_declared_grade !== null &&
    ctx.request.self_declared_grade !== verifiedGrade;
  const newStatus: 'qc_passed' | 'qc_downgraded' = downgraded ? 'qc_downgraded' : 'qc_passed';

  // 1) Insert refurb_listings (without shopify gid yet).
  const ins = await hasuraAdmin<{
    insert_refurb_listings_one: { id: string };
    update_return_requests_by_pk: { id: string; status: string } | null;
  }>(
    /* GraphQL */ `
      mutation InsertRefurb(
        $rr: uuid!
        $orig: uuid!
        $grade: condition_grade!
        $price: Int!
        $status: return_status!
      ) {
        insert_refurb_listings_one(
          object: {
            return_request_id: $rr
            original_product_id: $orig
            condition_grade: $grade
            listed_price_inr: $price
          }
        ) { id }

        update_return_requests_by_pk(
          pk_columns: { id: $rr }
          _set: { status: $status }
        ) { id status }
      }
    `,
    {
      rr: ctx.request.id,
      orig: ctx.product.id,
      grade: verifiedGrade,
      price: pricing.refurbListedPriceInr,
      status: newStatus,
    },
  );
  const refurbListingId = ins.insert_refurb_listings_one.id;
  await appendEvent(ctx.request.id, newStatus, {
    verifiedGrade,
    selfDeclaredGrade: ctx.request.self_declared_grade,
    refurb_listing_id: refurbListingId,
    listed_price_inr: pricing.refurbListedPriceInr,
  });

  // 2) Call the connector to publish to the Renewed collection.
  const connector = getShopifyConnector();
  const productResp = await connector.createRenewedProduct({
    title: `${ctx.product.title} (Renewed - ${verifiedGrade})`,
    descriptionHtml: ctx.product.description ?? undefined,
    vendor: 'Miniture',
    tags: [
      'renewed',
      `condition:${verifiedGrade}`,
      ...(ctx.product.category ? [`category:${ctx.product.category}`] : []),
    ],
    status: 'ACTIVE',
    images: ctx.product.hero_image_url
      ? [{ src: ctx.product.hero_image_url }]
      : [],
    variant: {
      price: { amount: String(pricing.refurbListedPriceInr), currencyCode: 'INR' },
      compareAtPrice: { amount: String(ctx.product.price_inr), currencyCode: 'INR' },
      sku: `REN-${ctx.request.id.slice(0, 8)}`,
      inventoryQuantity: 1,
    },
    metafields: [
      {
        namespace: 'miniture_renewed',
        key: 'condition_grade',
        value: verifiedGrade,
        type: 'single_line_text_field',
      },
      {
        namespace: 'miniture_renewed',
        key: 'source_unit_id',
        value: ctx.unit.id,
        type: 'single_line_text_field',
      },
    ],
  });
  if (!productResp.ok) {
    throw new Error(`createRenewedProduct failed: ${productResp.error.message}`);
  }
  const shopifyGid = productResp.data.id;

  // 3) Patch the listing with the shopify GID + listed_at.
  await hasuraAdmin(
    /* GraphQL */ `
      mutation MarkListed($id: uuid!, $gid: String!) {
        update_refurb_listings_by_pk(
          pk_columns: { id: $id }
          _set: { shopify_renewed_product_id: $gid, listed_at: "now()" }
        ) { id }
      }
    `,
    { id: refurbListingId, gid: shopifyGid },
  );

  // 4) Insert the store credit ledger row.
  const sourceType = path === 'trade_in' ? 'trade_in_payout' : 'refurb_payout';
  const ledger = await hasuraAdmin<{
    insert_store_credit_ledger_one: { id: string };
  }>(
    /* GraphQL */ `
      mutation Credit(
        $account: uuid!
        $amount: Int!
        $source: credit_source_type!
        $source_id: uuid!
        $expires: timestamptz
      ) {
        insert_store_credit_ledger_one(
          object: {
            account_id: $account
            amount_inr: $amount
            source_type: $source
            source_id: $source_id
            expires_at: $expires
          }
        ) { id }
      }
    `,
    {
      account: ctx.account.id,
      amount: pricing.creditAmountInr,
      source: sourceType,
      source_id: ctx.request.id,
      expires: pricing.expiresAtIso,
    },
  );
  const ledgerId = ledger.insert_store_credit_ledger_one.id;

  // 5) Trade-in only: insert trade_in_credits row + own status.
  let tradeInCreditId: string | undefined;
  if (path === 'trade_in') {
    const ti = await hasuraAdmin<{
      insert_trade_in_credits_one: { id: string };
    }>(
      /* GraphQL */ `
        mutation TradeIn($rr: uuid!, $amount: Int!, $expires: timestamptz!) {
          insert_trade_in_credits_one(
            object: {
              return_request_id: $rr
              credit_amount_inr: $amount
              expires_at: $expires
            }
          ) { id }
        }
      `,
      {
        rr: ctx.request.id,
        amount: pricing.creditAmountInr,
        expires: pricing.expiresAtIso!, // always set for trade_in
      },
    );
    tradeInCreditId = ti.insert_trade_in_credits_one.id;
  }

  // 6) Mark the unit returned / traded_in.
  const unitNewStatus = path === 'trade_in' ? 'traded_in' : 'returned';
  await hasuraAdmin(
    /* GraphQL */ `
      mutation FlipUnit($id: uuid!, $status: owned_unit_status!) {
        update_owned_units_by_pk(
          pk_columns: { id: $id }
          _set: { status: $status, returned_at: "now()" }
        ) { id status }
      }
    `,
    { id: ctx.unit.id, status: unitNewStatus },
  );

  // 7) Append a final event for each side-effect (admin dashboard timeline).
  await appendEvent(ctx.request.id, 'listed', {
    shopify_renewed_product_id: shopifyGid,
  });
  await appendEvent(ctx.request.id, 'credited', {
    credit_amount_inr: pricing.creditAmountInr,
    ledger_id: ledgerId,
    source_type: sourceType,
  });

  return {
    status: newStatus,
    refurb_listing_id: refurbListingId,
    shopify_renewed_product_gid: shopifyGid,
    credit_amount_inr: pricing.creditAmountInr,
    ledger_id: ledgerId,
    trade_in_credit_id: tradeInCreditId,
  };
}

// ---------------------------------------------------------------------------
// Donate path
// ---------------------------------------------------------------------------

async function runDonate(ctx: RequestContext): Promise<ApproveQcResult> {
  // Grab first active NGO.
  const ngos = await hasuraAdmin<{ ngo_partners: { id: string; name: string }[] }>(
    /* GraphQL */ `
      query NgoPick {
        ngo_partners(where: { active: { _eq: true } }, limit: 1) { id name }
      }
    `,
  );
  if (!ngos.ngo_partners.length) throw new Error('no active NGO partners');
  const ngo = ngos.ngo_partners[0];

  const ins = await hasuraAdmin<{
    insert_donation_records_one: { id: string };
    update_return_requests_by_pk: { id: string } | null;
    update_owned_units_by_pk: { id: string } | null;
  }>(
    /* GraphQL */ `
      mutation Donate($rr: uuid!, $unit: uuid!, $ngo: uuid!) {
        insert_donation_records_one(
          object: {
            return_request_id: $rr
            ngo_partner_id: $ngo
          }
        ) { id }

        update_return_requests_by_pk(
          pk_columns: { id: $rr }
          _set: { status: "completed" }
        ) { id }

        update_owned_units_by_pk(
          pk_columns: { id: $unit }
          _set: { status: "donated", returned_at: "now()" }
        ) { id }
      }
    `,
    { rr: ctx.request.id, unit: ctx.unit.id, ngo: ngo.id },
  );
  const donationRecordId = ins.insert_donation_records_one.id;

  await appendEvent(ctx.request.id, 'donated_to_ngo', {
    ngo_partner_id: ngo.id,
    ngo_name: ngo.name,
    donation_record_id: donationRecordId,
  });

  return { status: 'completed', donation_record_id: donationRecordId };
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

export default async function handler(req: any, res: any) {
  try {
    const session = readSession(req);
    if (session.role !== 'ops' && session.role !== 'admin') {
      return res.status(403).json({ error: 'ops or admin role required' });
    }
    const result = await approveQc((req.body ?? {}) as ReqBody);
    res.status(200).json(result);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

export const __test = { approveQc, loadContext };
