#!/usr/bin/env python3
"""
End-to-end smoke test for the Miniture Buyback backend.

Routes through the SOCKS5 proxy at 127.0.0.1:1080 and uses the admin
secret. Runs through:

  1. Pick Josh's FlexDesk owned_unit.
  2. Simulate `submit-return-request` (insert return_request, transition
     unit to `return_pending`, append events).
  3. Simulate `approve-qc` for a refurb / verified_grade='good':
       - upsert qc_verified condition_assessment
       - transition request to qc_passed
       - insert refurb_listing
       - insert shopify_stub_products row + log entry (mirrors what the
         connector does — one cross-cloud GraphQL call would be ideal but
         doing it directly keeps this script side-effect-only on Hasura)
       - link the listing to the stub_product GID
       - insert store_credit_ledger row
       - flip owned_unit.status to `returned`.
  4. Verify:
       - refurb_listings has shopify_renewed_product_id set
       - store_credit_ledger has the expected positive row for Josh
       - shopify_stub_log has at least 1 createRenewedProduct entry
  5. Cleanup so the script is idempotent — re-runs cleanly forever.

Exits 0 on success, non-zero on the first failure. Prints a numbered
report along the way.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import uuid
from typing import Any

GRAPHQL_URL = "https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/graphql"
SOCKS_PROXY = "127.0.0.1:1080"

# Seed UUIDs lifted directly from nhost/seeds/default/0001_demo_data.sql.
JOSH_ACCOUNT_ID = "bbbbbbbb-0001-0000-0000-000000000001"
JOSH_FLEXDESK_UNIT_ID = "ffffffff-0001-0000-0000-000000000001"  # FlexDesk 6-in-1
JOSH_FLEXDESK_PRODUCT_ID = "aaaaaaaa-0001-0000-0000-000000000013"
JOSH_FLEXDESK_PRICE = 15499  # rupees, from the seed

# Pricing constants — match functions/_lib/pricing.ts.
REFURB_MULTIPLIER = {"good": 0.55, "fair": 0.40, "worn": 0.25, "unfit": 0.0}
PARENT_SHARE = 0.85


def admin_secret() -> str:
    s = os.environ.get("GENERATED_SECRET") or os.environ.get(
        "HASURA_GRAPHQL_ADMIN_SECRET"
    )
    if not s:
        sys.exit(
            "Admin secret not set. Run: set -a; source .cloud-admin-secret; set +a"
        )
    return s


def gql(query: str, variables: dict | None = None) -> dict:
    body = json.dumps({"query": query, "variables": variables or {}})
    cmd = [
        "curl",
        "--silent",
        "--show-error",
        "--max-time",
        "30",
        "--socks5-hostname",
        SOCKS_PROXY,
        "-X",
        "POST",
        GRAPHQL_URL,
        "-H",
        "Content-Type: application/json",
        "-H",
        f"x-hasura-admin-secret: {admin_secret()}",
        "-d",
        body,
    ]
    last_err = ""
    for attempt in range(3):
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            last_err = f"curl rc={r.returncode}: {r.stderr.strip()}"
            time.sleep(0.5 + attempt * 0.5)
            continue
        try:
            j = json.loads(r.stdout)
        except json.JSONDecodeError:
            last_err = f"non-JSON: {r.stdout[:200]}"
            time.sleep(0.5)
            continue
        if "errors" in j:
            raise RuntimeError(f"GraphQL errors: {json.dumps(j['errors'])[:500]}")
        return j["data"]
    raise RuntimeError(f"gql exhausted retries; last: {last_err}")


def section(n: int, title: str) -> None:
    print(f"\n[{n}] {title}")


# ---------------------------------------------------------------------------
# Cleanup (also runs at the end on success).
# ---------------------------------------------------------------------------


def cleanup() -> None:
    """
    Remove anything created by a previous run so we start clean. Order
    matters because of FK relationships:
      - delete shopify_stub_log entries from a previous test (best-effort by
        operation+request payload; we narrow with the `__test=smoke` marker
        we put in the metafields)
      - delete store_credit_ledger rows tied to refurb_payout for our request
      - delete shopify_stub_products with the synthetic SKU prefix REN-SMOKE
      - delete refurb_listings with original_product_id = FlexDesk + grade good
      - delete return_request_events that are children
      - delete condition_assessments
      - delete return_requests for FlexDesk unit
      - reset owned_unit.status back to 'owned'
    """
    # 1) Find any return_requests we created against the FlexDesk unit.
    rrs = gql(
        """
        query FindRR($unit: uuid!) {
          return_requests(where: { owned_unit_id: { _eq: $unit } }) { id }
        }
        """,
        {"unit": JOSH_FLEXDESK_UNIT_ID},
    )["return_requests"]
    rr_ids = [r["id"] for r in rrs]

    # 2) Delete the credit_ledger rows whose source_id matches.
    if rr_ids:
        gql(
            """
            mutation Cleanup1($rrs: [uuid!]!) {
              delete_store_credit_ledger(where: { source_id: { _in: $rrs } }) { affected_rows }
              delete_refurb_listings(where: { return_request_id: { _in: $rrs } }) { affected_rows }
              delete_trade_in_credits(where: { return_request_id: { _in: $rrs } }) { affected_rows }
              delete_donation_records(where: { return_request_id: { _in: $rrs } }) { affected_rows }
              delete_condition_assessments(where: { return_request_id: { _in: $rrs } }) { affected_rows }
              delete_return_request_events(where: { return_request_id: { _in: $rrs } }) { affected_rows }
              delete_return_requests(where: { id: { _in: $rrs } }) { affected_rows }
            }
            """,
            {"rrs": rr_ids},
        )

    # 3) Delete shopify_stub_products created by the smoke test (SKU prefix).
    gql(
        """
        mutation CleanStubs {
          delete_shopify_stub_products(where: { variant_sku: { _ilike: "REN-SMOKE-%" } }) { affected_rows }
          delete_shopify_stub_log(where: { request_payload: { _contains: { __test: "smoke" } } }) { affected_rows }
        }
        """
    )

    # 4) Reset the unit.
    gql(
        """
        mutation ResetUnit($id: uuid!) {
          update_owned_units_by_pk(
            pk_columns: { id: $id }
            _set: { status: "owned", returned_at: null }
          ) { id status }
        }
        """,
        {"id": JOSH_FLEXDESK_UNIT_ID},
    )


# ---------------------------------------------------------------------------
# Smoke flow
# ---------------------------------------------------------------------------


def step_submit_return() -> str:
    qr = str(uuid.uuid4())
    data = gql(
        """
        mutation Submit(
          $unit: uuid!, $account: uuid!, $qr: String!
        ) {
          insert_return_requests_one(
            object: {
              owned_unit_id: $unit
              account_id: $account
              path: "refurb"
              status: "submitted"
              self_declared_grade: "good"
              pickup_qr_code: $qr
              pickup_address: { line1: "42 Indira Nagar", city: "Bengaluru" }
            }
          ) { id }
          update_owned_units_by_pk(
            pk_columns: { id: $unit }
            _set: { status: "return_pending" }
          ) { id status }
        }
        """,
        {"unit": JOSH_FLEXDESK_UNIT_ID, "account": JOSH_ACCOUNT_ID, "qr": qr},
    )
    rr_id = data["insert_return_requests_one"]["id"]
    gql(
        """
        mutation E($rr: uuid!, $payload: jsonb!) {
          insert_return_request_events_one(
            object: {
              return_request_id: $rr
              event_type: "submitted"
              payload: $payload
            }
          ) { id }
          insert_condition_assessments_one(
            object: {
              return_request_id: $rr
              phase: "self_declared"
              grade: "good"
            }
          ) { id }
        }
        """,
        {"rr": rr_id, "payload": {"qr": qr, "path": "refurb", "grade": "good"}},
    )
    print(f"    return_request_id={rr_id}  qr={qr}")
    return rr_id


def step_approve_qc(rr_id: str) -> dict[str, Any]:
    refurb_price = round(JOSH_FLEXDESK_PRICE * REFURB_MULTIPLIER["good"])
    credit = round(refurb_price * PARENT_SHARE)

    # 1. QC assessment.
    gql(
        """
        mutation Qc($rr: uuid!) {
          insert_condition_assessments_one(
            object: {
              return_request_id: $rr
              phase: "qc_verified"
              grade: "good"
            }
            on_conflict: {
              constraint: condition_assessments_return_request_id_phase_key
              update_columns: [grade]
            }
          ) { id }
          update_return_requests_by_pk(
            pk_columns: { id: $rr }
            _set: { status: "qc_passed" }
          ) { id status }
        }
        """,
        {"rr": rr_id},
    )

    # 2. Refurb listing (no shopify_renewed_product_id yet).
    listing = gql(
        """
        mutation List($rr: uuid!, $orig: uuid!, $price: Int!) {
          insert_refurb_listings_one(
            object: {
              return_request_id: $rr
              original_product_id: $orig
              condition_grade: "good"
              listed_price_inr: $price
            }
          ) { id }
        }
        """,
        {"rr": rr_id, "orig": JOSH_FLEXDESK_PRODUCT_ID, "price": refurb_price},
    )["insert_refurb_listings_one"]

    # 3. Simulate ShopifyStub.createRenewedProduct — write the stub product
    #    + log row that the connector would have created.
    shopify_gid = f"gid://shopify/Product/{uuid.uuid4()}"
    sku = f"REN-SMOKE-{rr_id[:8]}"
    request_payload = {
        "__test": "smoke",
        "title": "FlexDesk 6-in-1 Multi-Feature Study Table (Renewed - good)",
        "variant": {"price": {"amount": str(refurb_price), "currencyCode": "INR"}, "sku": sku},
        "tags": ["renewed", "condition:good", "category:literacy"],
    }
    response_payload = {
        "id": shopify_gid,
        "title": request_payload["title"],
        "status": "ACTIVE",
        "tags": request_payload["tags"],
    }
    gql(
        """
        mutation StubCreate(
          $gid: String!, $title: String!, $sku: String!,
          $price: String!, $compare: String!,
          $tags: [String!]!, $coll: [String!]!, $images: jsonb!,
          $req: jsonb!, $resp: jsonb!
        ) {
          insert_shopify_stub_products_one(
            object: {
              shopify_gid: $gid
              title: $title
              status: "ACTIVE"
              tags: $tags
              variant_price_amount: $price
              variant_price_currency: "INR"
              variant_compare_at_amount: $compare
              variant_compare_at_currency: "INR"
              variant_sku: $sku
              variant_inventory_qty: 1
              images: $images
              metafields: []
              collection_ids: $coll
              online_store_url: "https://miniture.in/products/flexdesk-renewed-smoke"
            }
          ) { id }
          insert_shopify_stub_log_one(
            object: {
              operation: "createRenewedProduct"
              request_payload: $req
              response_payload: $resp
              ok: true
              duration_ms: 18
            }
          ) { id }
        }
        """,
        {
            "gid": shopify_gid,
            "title": request_payload["title"],
            "sku": sku,
            "price": str(refurb_price),
            "compare": str(JOSH_FLEXDESK_PRICE),
            "tags": ["renewed", "condition:good", "category:literacy"],
            "coll": ["gid://shopify/Collection/miniture-renewed"],
            "images": [
                {"src": "https://miniture.in/cdn/shop/files/flexdesk-6in1.jpg"}
            ],
            "req": request_payload,
            "resp": response_payload,
        },
    )

    # 4. Patch the listing with the gid + listed_at.
    gql(
        """
        mutation MarkListed($id: uuid!, $gid: String!) {
          update_refurb_listings_by_pk(
            pk_columns: { id: $id }
            _set: { shopify_renewed_product_id: $gid, listed_at: "now()" }
          ) { id shopify_renewed_product_id listed_at }
        }
        """,
        {"id": listing["id"], "gid": shopify_gid},
    )

    # 5. Credit ledger.
    ledger = gql(
        """
        mutation Cred($acc: uuid!, $amt: Int!, $src: uuid!) {
          insert_store_credit_ledger_one(
            object: {
              account_id: $acc
              amount_inr: $amt
              source_type: "refurb_payout"
              source_id: $src
            }
          ) { id amount_inr }
        }
        """,
        {"acc": JOSH_ACCOUNT_ID, "amt": credit, "src": rr_id},
    )["insert_store_credit_ledger_one"]

    # 6. Flip owned_unit.
    gql(
        """
        mutation Flip($id: uuid!) {
          update_owned_units_by_pk(
            pk_columns: { id: $id }
            _set: { status: "returned", returned_at: "now()" }
          ) { id status }
        }
        """,
        {"id": JOSH_FLEXDESK_UNIT_ID},
    )

    return {
        "refurb_listing_id": listing["id"],
        "shopify_gid": shopify_gid,
        "credit_amount_inr": credit,
        "ledger_id": ledger["id"],
    }


def step_verify(rr_id: str, expected: dict) -> None:
    data = gql(
        """
        query V($rr: uuid!, $unit: uuid!, $acct: uuid!) {
          refurb_listings(where: { return_request_id: { _eq: $rr } }) {
            id shopify_renewed_product_id listed_at listed_price_inr condition_grade
          }
          store_credit_ledger(where: { source_id: { _eq: $rr } }) {
            id amount_inr source_type account_id
          }
          shopify_stub_log_aggregate(where: {
            operation: { _eq: "createRenewedProduct" }
            ok: { _eq: true }
            request_payload: { _contains: { __test: "smoke" } }
          }) { aggregate { count } }
          owned_units_by_pk(id: $unit) { id status }
          accounts_by_pk(id: $acct) {
            credit_ledger_entries_aggregate(where: { source_id: { _eq: $rr } }) {
              aggregate { sum { amount_inr } }
            }
          }
        }
        """,
        {"rr": rr_id, "unit": JOSH_FLEXDESK_UNIT_ID, "acct": JOSH_ACCOUNT_ID},
    )

    listings = data["refurb_listings"]
    assert listings, "refurb_listings row missing"
    assert listings[0]["shopify_renewed_product_id"] == expected["shopify_gid"], (
        f"shopify_renewed_product_id mismatch: {listings[0]['shopify_renewed_product_id']}"
    )
    assert listings[0]["listed_at"] is not None, "listed_at not set"
    assert listings[0]["condition_grade"] == "good", "condition_grade wrong"
    print(
        f"    refurb_listing OK  price=₹{listings[0]['listed_price_inr']}  gid={listings[0]['shopify_renewed_product_id']}"
    )

    ledger_rows = data["store_credit_ledger"]
    assert ledger_rows, "no ledger row found"
    assert ledger_rows[0]["amount_inr"] == expected["credit_amount_inr"], (
        f"ledger amount mismatch: {ledger_rows[0]['amount_inr']} != {expected['credit_amount_inr']}"
    )
    assert ledger_rows[0]["source_type"] == "refurb_payout", "source_type wrong"
    assert ledger_rows[0]["account_id"] == JOSH_ACCOUNT_ID, "ledger account wrong"
    print(
        f"    store_credit_ledger OK  +₹{ledger_rows[0]['amount_inr']} as refurb_payout"
    )

    log_count = data["shopify_stub_log_aggregate"]["aggregate"]["count"]
    assert log_count >= 1, f"expected >=1 createRenewedProduct log entry, got {log_count}"
    print(f"    shopify_stub_log OK  {log_count} createRenewedProduct entries (this run)")

    unit = data["owned_units_by_pk"]
    assert unit["status"] == "returned", f"owned_unit status is {unit['status']}"
    print(f"    owned_units OK  status={unit['status']}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    print(f"==> Smoke test against {GRAPHQL_URL} via SOCKS5 {SOCKS_PROXY}")

    # Pre-flight: prove the cloud is reachable + admin secret valid.
    try:
        ping = gql("query { accounts_aggregate { aggregate { count } } }")
        print(
            f"    cloud reachable; accounts={ping['accounts_aggregate']['aggregate']['count']}"
        )
    except Exception as e:
        print(f"!! pre-flight failed: {e}")
        return 2

    # Always start clean.
    section(0, "Cleanup any leftover state from previous runs")
    cleanup()

    section(1, "Pick Josh's FlexDesk owned_unit")
    data = gql(
        """
        query Pick($unit: uuid!) {
          owned_units_by_pk(id: $unit) {
            id status
            product { title price_inr }
            account { display_name }
          }
        }
        """,
        {"unit": JOSH_FLEXDESK_UNIT_ID},
    )
    u = data["owned_units_by_pk"]
    assert u and u["status"] == "owned", f"unexpected unit state: {u}"
    print(
        f"    {u['account']['display_name']}'s {u['product']['title']} (₹{u['product']['price_inr']}, status={u['status']})"
    )

    section(2, "Submit return request (path=refurb, self_declared_grade=good)")
    rr_id = step_submit_return()

    section(3, "Approve QC (verified_grade=good)")
    result = step_approve_qc(rr_id)
    print(
        f"    listing={result['refurb_listing_id']}  shopify={result['shopify_gid']}\n"
        f"    credit=₹{result['credit_amount_inr']}  ledger={result['ledger_id']}"
    )

    section(4, "Verify side-effects")
    step_verify(rr_id, result)

    section(5, "Cleanup test artefacts")
    cleanup()
    print("    cleanup done")

    print("\nSMOKE OK")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as e:
        print(f"\n!! ASSERTION FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n!! UNEXPECTED ERROR: {e}")
        sys.exit(2)
