import { gql } from '@apollo/client';

// QC approve / reject flow.
//
// TODO: move to approve-qc Function once deployed. The function's contract
// will be: POST /v1/approve-qc { return_request_id, verified_grade, notes }
// → it INSERTs the qc_verified condition_assessment, INSERTs the right
// outcome row (refurb_listings | trade_in_credits | donation_records),
// INSERTs a store_credit_ledger row if applicable, INSERTs a
// return_request_events entry, UPDATEs return_requests.status, and (for
// refurb/trade-in) calls ShopifyConnector.createRenewedProduct().
//
// In the demo we approximate it client-side with a chained Hasura mutation
// that covers the same writes. The connector "call" falls out because the
// stub is also a Postgres table, so we INSERT directly into
// shopify_stub_products + shopify_stub_log to simulate the connector firing.
// Three flat mutations (one per path) keep the variable shapes clean — the
// screen picks which to fire based on `return_requests.path`.

// ---------------------------------------------------------------------------
// Refurb path → status `qc_passed`, refurb listing, refurb_payout credit
// ---------------------------------------------------------------------------

export const ADMIN_APPROVE_QC_REFURB_MUTATION = gql`
  mutation AdminApproveQcRefurb(
    $return_request_id: uuid!
    $account_id: uuid!
    $owned_unit_id: uuid!
    $original_product_id: uuid!
    $verified_grade: String!
    $notes: String
    $listed_price_inr: Int!
    $credit_amount_inr: Int!
    $shopify_gid: String!
    $shopify_title: String!
    $shopify_price_str: String!
    $stub_request_payload: jsonb!
    $stub_response_payload: jsonb!
  ) {
    insert_condition_assessments_one(
      object: {
        return_request_id: $return_request_id
        phase: "qc_verified"
        grade: $verified_grade
        notes: $notes
      }
    ) {
      id
    }
    insert_refurb_listings_one(
      object: {
        return_request_id: $return_request_id
        original_product_id: $original_product_id
        condition_grade: $verified_grade
        listed_price_inr: $listed_price_inr
        shopify_renewed_product_id: $shopify_gid
      }
    ) {
      id
      shopify_renewed_product_id
    }
    insert_shopify_stub_products_one(
      object: {
        shopify_gid: $shopify_gid
        title: $shopify_title
        status: "ACTIVE"
        product_type: "Renewed"
        variant_price_amount: $shopify_price_str
        variant_price_currency: "INR"
        variant_inventory_qty: 1
      }
    ) {
      id
    }
    insert_shopify_stub_log_one(
      object: {
        operation: "createRenewedProduct"
        request_payload: $stub_request_payload
        response_payload: $stub_response_payload
        ok: true
        duration_ms: 142
      }
    ) {
      id
    }
    insert_store_credit_ledger_one(
      object: {
        account_id: $account_id
        amount_inr: $credit_amount_inr
        source_type: "refurb_payout"
        source_id: $return_request_id
      }
    ) {
      id
    }
    insert_return_request_events_one(
      object: {
        return_request_id: $return_request_id
        event_type: "qc_passed"
        payload: $stub_response_payload
      }
    ) {
      id
    }
    update_owned_units_by_pk(
      pk_columns: { id: $owned_unit_id }
      _set: { status: "returned" }
    ) {
      id
    }
    update_return_requests_by_pk(
      pk_columns: { id: $return_request_id }
      _set: { status: "qc_passed" }
    ) {
      id
      status
    }
  }
`;

// ---------------------------------------------------------------------------
// Trade-in path → same physical pipeline as refurb but with expiring credit
// ---------------------------------------------------------------------------

export const ADMIN_APPROVE_QC_TRADE_IN_MUTATION = gql`
  mutation AdminApproveQcTradeIn(
    $return_request_id: uuid!
    $account_id: uuid!
    $owned_unit_id: uuid!
    $original_product_id: uuid!
    $verified_grade: String!
    $notes: String
    $listed_price_inr: Int!
    $credit_amount_inr: Int!
    $expires_at: timestamptz!
    $shopify_gid: String!
    $shopify_title: String!
    $shopify_price_str: String!
    $stub_request_payload: jsonb!
    $stub_response_payload: jsonb!
  ) {
    insert_condition_assessments_one(
      object: {
        return_request_id: $return_request_id
        phase: "qc_verified"
        grade: $verified_grade
        notes: $notes
      }
    ) {
      id
    }
    insert_refurb_listings_one(
      object: {
        return_request_id: $return_request_id
        original_product_id: $original_product_id
        condition_grade: $verified_grade
        listed_price_inr: $listed_price_inr
        shopify_renewed_product_id: $shopify_gid
      }
    ) {
      id
    }
    insert_trade_in_credits_one(
      object: {
        return_request_id: $return_request_id
        credit_amount_inr: $credit_amount_inr
        expires_at: $expires_at
      }
    ) {
      id
    }
    insert_shopify_stub_products_one(
      object: {
        shopify_gid: $shopify_gid
        title: $shopify_title
        status: "ACTIVE"
        product_type: "Renewed"
        variant_price_amount: $shopify_price_str
        variant_price_currency: "INR"
        variant_inventory_qty: 1
      }
    ) {
      id
    }
    insert_shopify_stub_log_one(
      object: {
        operation: "createRenewedProduct"
        request_payload: $stub_request_payload
        response_payload: $stub_response_payload
        ok: true
        duration_ms: 161
      }
    ) {
      id
    }
    insert_store_credit_ledger_one(
      object: {
        account_id: $account_id
        amount_inr: $credit_amount_inr
        source_type: "trade_in_payout"
        source_id: $return_request_id
        expires_at: $expires_at
      }
    ) {
      id
    }
    insert_return_request_events_one(
      object: {
        return_request_id: $return_request_id
        event_type: "qc_passed"
        payload: $stub_response_payload
      }
    ) {
      id
    }
    update_owned_units_by_pk(
      pk_columns: { id: $owned_unit_id }
      _set: { status: "traded_in" }
    ) {
      id
    }
    update_return_requests_by_pk(
      pk_columns: { id: $return_request_id }
      _set: { status: "qc_passed" }
    ) {
      id
      status
    }
  }
`;

// ---------------------------------------------------------------------------
// Donate path → no refurb listing, no credit row, but donation_records +
// a small "thank you" discount code.
// ---------------------------------------------------------------------------

export const ADMIN_APPROVE_QC_DONATE_MUTATION = gql`
  mutation AdminApproveQcDonate(
    $return_request_id: uuid!
    $account_id: uuid!
    $owned_unit_id: uuid!
    $verified_grade: String!
    $notes: String
    $ngo_partner_id: uuid!
    $discount_code: String!
    $discount_pct: Int!
    $discount_expires_at: timestamptz!
    $shopify_discount_gid: String!
    $stub_request_payload: jsonb!
    $stub_response_payload: jsonb!
  ) {
    insert_condition_assessments_one(
      object: {
        return_request_id: $return_request_id
        phase: "qc_verified"
        grade: $verified_grade
        notes: $notes
      }
    ) {
      id
    }
    insert_donation_records_one(
      object: {
        return_request_id: $return_request_id
        ngo_partner_id: $ngo_partner_id
      }
    ) {
      id
    }
    insert_discount_codes_one(
      object: {
        account_id: $account_id
        code: $discount_code
        discount_pct: $discount_pct
        expires_at: $discount_expires_at
        shopify_price_rule_id: $shopify_discount_gid
      }
    ) {
      id
      code
    }
    insert_shopify_stub_discount_codes_one(
      object: {
        shopify_gid: $shopify_discount_gid
        code: $discount_code
        percentage_off: $discount_pct
        ends_at: $discount_expires_at
        once_per_customer: true
      }
    ) {
      id
    }
    insert_shopify_stub_log_one(
      object: {
        operation: "createDiscountCode"
        request_payload: $stub_request_payload
        response_payload: $stub_response_payload
        ok: true
        duration_ms: 98
      }
    ) {
      id
    }
    insert_return_request_events_one(
      object: {
        return_request_id: $return_request_id
        event_type: "qc_passed"
        payload: $stub_response_payload
      }
    ) {
      id
    }
    update_owned_units_by_pk(
      pk_columns: { id: $owned_unit_id }
      _set: { status: "donated" }
    ) {
      id
    }
    update_return_requests_by_pk(
      pk_columns: { id: $return_request_id }
      _set: { status: "qc_passed" }
    ) {
      id
      status
    }
  }
`;

// ---------------------------------------------------------------------------
// Reject (verified_grade=unfit). Status → qc_failed, owned_unit returns to
// `owned` so the parent can keep the item.
// ---------------------------------------------------------------------------

export const ADMIN_REJECT_QC_MUTATION = gql`
  mutation AdminRejectQc(
    $return_request_id: uuid!
    $owned_unit_id: uuid!
    $notes: String
    $payload: jsonb!
  ) {
    insert_condition_assessments_one(
      object: {
        return_request_id: $return_request_id
        phase: "qc_verified"
        grade: "unfit"
        notes: $notes
      }
    ) {
      id
    }
    insert_return_request_events_one(
      object: {
        return_request_id: $return_request_id
        event_type: "qc_failed"
        payload: $payload
      }
    ) {
      id
    }
    update_owned_units_by_pk(
      pk_columns: { id: $owned_unit_id }
      _set: { status: "owned" }
    ) {
      id
    }
    update_return_requests_by_pk(
      pk_columns: { id: $return_request_id }
      _set: { status: "qc_failed" }
    ) {
      id
      status
    }
  }
`;

export const ADMIN_FIRST_ACTIVE_NGO_QUERY = gql`
  query AdminFirstActiveNgo {
    ngo_partners(where: { active: { _eq: true } }, limit: 1) {
      id
      name
    }
  }
`;
