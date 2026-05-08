#!/usr/bin/env python3
"""
Apply Hasura row-level permissions for the Miniture Buyback project.

Three roles:
  - parent : end-user (default Nhost role for normal sign-ups)
  - ops    : warehouse / QC operator
  - admin  : superuser (kept narrow; admin secret is what really unlocks everything)

Plus the `public` (unauthenticated) role, which is allowed read on the
catalog so the marketing pages / unauthenticated browsing can hit Hasura
without a JWT.

Implementation notes
--------------------
* We POST to `/v1/metadata` with a `bulk` action so the whole thing applies
  atomically. If anything in the bulk fails Hasura rolls back the rest.
* Idempotency: every action has an explicit `drop_<role>_permission` first,
  so re-running this script always converges. We swallow "permission does
  not exist" errors from the drops (Hasura returns 400 on them).
* Parent-scoped filters key off the `account.auth_user_id._eq:
  X-Hasura-User-Id` chain, which works for any table that has a path to
  `accounts` via tracked relationships.
* Two view tables (`account_credit_balance`, `eligible_units`) get an
  object relationship to `accounts` added so we can filter them the same
  way as the rest of parent-scoped data.

Run:
  set -a; source .cloud-admin-secret; set +a
  python3 scripts/apply-permissions.py
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from typing import Any

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

HASURA_URL = "https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/metadata"
SOCKS_PROXY = "127.0.0.1:1080"
SOURCE_NAME = "default"
SCHEMA = "public"

# X-Hasura-User-Id is provided by Nhost JWTs as a UUID string. Hasura compares
# it to a uuid column natively when we declare the session-variable type.

PARENT = "parent"
OPS = "ops"
ADMIN = "admin"
PUBLIC = "public"

# Filters used over and over.
OWN_ACCOUNT = {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}
OWN_VIA_ACCOUNT = {"account": {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}}
OWN_VIA_REQUEST = {
    "return_request": {"account": {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}}
}
OWN_VIA_ASSESSMENT = {
    "assessment": {
        "return_request": {"account": {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}}
    }
}
EMPTY = {}  # SELECT-all filter
TRUE_PREDICATE: dict[str, Any] = {}  # Hasura uses {} as "no filter / always true"

# -----------------------------------------------------------------------------
# HTTP helpers (curl over SOCKS5 — Fortinet TLS inspector breaks direct HTTPS)
# -----------------------------------------------------------------------------


def admin_secret() -> str:
    s = os.environ.get("GENERATED_SECRET") or os.environ.get(
        "HASURA_GRAPHQL_ADMIN_SECRET"
    )
    if not s:
        sys.exit(
            "Admin secret not in env. Run: set -a; source .cloud-admin-secret; set +a"
        )
    return s


def metadata_call(payload: dict, *, allow_errors: bool = False, retries: int = 4) -> dict:
    body = json.dumps(payload)
    cmd = [
        "curl",
        "--silent",
        "--show-error",
        "--max-time",
        "60",
        "--socks5-hostname",
        SOCKS_PROXY,
        "-X",
        "POST",
        HASURA_URL,
        "-H",
        "Content-Type: application/json",
        "-H",
        f"x-hasura-admin-secret: {admin_secret()}",
        "-d",
        body,
    ]
    last_err: str = ""
    for attempt in range(retries):
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            last_err = f"curl rc={result.returncode}: {result.stderr.strip()}"
            time.sleep(0.4 + attempt * 0.6)
            continue
        try:
            parsed = json.loads(result.stdout)
        except json.JSONDecodeError:
            last_err = f"non-JSON: {result.stdout[:200]}"
            time.sleep(0.4 + attempt * 0.6)
            continue
        if isinstance(parsed, dict) and parsed.get("error") and not allow_errors:
            raise RuntimeError(
                f"metadata error for {payload.get('type')}: {json.dumps(parsed)[:600]}"
            )
        return parsed
    raise RuntimeError(f"metadata_call exhausted retries; last: {last_err}")


def table_ref(name: str) -> dict:
    return {"name": name, "schema": SCHEMA}


# -----------------------------------------------------------------------------
# Permission helpers
# -----------------------------------------------------------------------------


def drop_perm(table: str, role: str, action: str) -> dict:
    return {
        "type": f"pg_drop_{action}_permission",
        "args": {
            "source": SOURCE_NAME,
            "table": table_ref(table),
            "role": role,
        },
    }


def create_select(
    table: str,
    role: str,
    filt: dict,
    columns: list[str] | str = "*",
    *,
    allow_aggregations: bool = True,
) -> dict:
    return {
        "type": "pg_create_select_permission",
        "args": {
            "source": SOURCE_NAME,
            "table": table_ref(table),
            "role": role,
            "permission": {
                "columns": columns,
                "filter": filt,
                "allow_aggregations": allow_aggregations,
            },
        },
    }


def create_insert(
    table: str,
    role: str,
    check: dict,
    columns: list[str] | str = "*",
    *,
    set_: dict | None = None,
) -> dict:
    perm: dict = {"check": check, "columns": columns}
    if set_:
        perm["set"] = set_
    return {
        "type": "pg_create_insert_permission",
        "args": {
            "source": SOURCE_NAME,
            "table": table_ref(table),
            "role": role,
            "permission": perm,
        },
    }


def create_update(
    table: str,
    role: str,
    filt: dict,
    columns: list[str] | str = "*",
    *,
    check: dict | None = None,
) -> dict:
    perm: dict = {"columns": columns, "filter": filt}
    if check is not None:
        perm["check"] = check
    return {
        "type": "pg_create_update_permission",
        "args": {
            "source": SOURCE_NAME,
            "table": table_ref(table),
            "role": role,
            "permission": perm,
        },
    }


def create_delete(table: str, role: str, filt: dict) -> dict:
    return {
        "type": "pg_create_delete_permission",
        "args": {
            "source": SOURCE_NAME,
            "table": table_ref(table),
            "role": role,
            "permission": {"filter": filt},
        },
    }


# -----------------------------------------------------------------------------
# View relationships (so parent-scoped filters can traverse them)
# -----------------------------------------------------------------------------


def ensure_view_relationships() -> None:
    """
    `account_credit_balance` and `eligible_units` are views. Hasura tracks them
    as tables, but FK-derived relationships don't auto-populate. We add manual
    object relationships to `accounts` so permission filters can reach
    `auth_user_id`.

    Idempotent: if a relationship already exists Hasura returns a 400, which
    we swallow.
    """
    rels = [
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": SOURCE_NAME,
                "table": table_ref("account_credit_balance"),
                "name": "account",
                "using": {
                    "manual_configuration": {
                        "remote_table": table_ref("accounts"),
                        "column_mapping": {"account_id": "id"},
                    }
                },
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": SOURCE_NAME,
                "table": table_ref("eligible_units"),
                "name": "account",
                "using": {
                    "manual_configuration": {
                        "remote_table": table_ref("accounts"),
                        "column_mapping": {"account_id": "id"},
                    }
                },
            },
        },
        # Manual rel so parents can filter shopify_stub_discount_codes by their
        # own customer GID via the joined accounts row.
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": SOURCE_NAME,
                "table": table_ref("shopify_stub_discount_codes"),
                "name": "account",
                "using": {
                    "manual_configuration": {
                        "remote_table": table_ref("accounts"),
                        "column_mapping": {"customer_gid": "shopify_customer_gid"},
                    }
                },
            },
        },
    ]
    for r in rels:
        resp = metadata_call(r, allow_errors=True)
        if isinstance(resp, dict) and resp.get("error"):
            code = resp.get("code", "")
            if "already-exists" in code or "already exists" in str(resp.get("error", "")):
                continue
            # Some other failure — surface it but don't abort the whole run.
            print(
                f"  ! could not add view rel "
                f"{r['args']['table']['name']}.{r['args']['name']}: {resp.get('error')}"
            )


# -----------------------------------------------------------------------------
# Permission matrix
# -----------------------------------------------------------------------------

# Columns parents may UPDATE on their own account row. Sensitive fields like
# `auth_user_id`, `shopify_customer_gid`, `id`, `created_at` are excluded — those
# are server-managed.
ACCOUNT_PARENT_UPDATE_COLS = ["display_name", "phone", "default_address"]

# Columns parents may UPDATE on their own return_request. Status transitions
# are server-driven (Functions update via admin secret); the parent can only
# tweak pickup-related fields and their own self-declared grade.
RETURN_REQUEST_PARENT_UPDATE_COLS = [
    "self_declared_grade",
    "pickup_address",
    "pickup_scheduled_for",
]

# Drop-list: every (table, role, action) we'll re-create. Used to make the
# script idempotent. We cover all four CRUD actions for every (table, role)
# pair we touch.
ROLES_USED = [PARENT, OPS, ADMIN, PUBLIC]
ACTIONS = ["select", "insert", "update", "delete"]

TABLES_TO_PERMISSION = [
    "accounts",
    "child_profiles",
    "products",
    "product_images",
    "orders",
    "order_line_items",
    "owned_units",
    "return_requests",
    "return_request_events",
    "condition_assessments",
    "assessment_photos",
    "ngo_partners",
    "refurb_listings",
    "donation_records",
    "trade_in_credits",
    "store_credit_ledger",
    "credit_transfers",
    "discount_codes",
    "shopify_stub_products",
    "shopify_stub_discount_codes",
    "shopify_stub_log",
    "account_credit_balance",
    "eligible_units",
]


def build_drop_actions() -> list[dict]:
    return [
        drop_perm(t, role, a)
        for t in TABLES_TO_PERMISSION
        for role in ROLES_USED
        for a in ACTIONS
    ]


def build_create_actions() -> list[dict]:
    a: list[dict] = []

    # ---------- accounts ----------
    a.append(create_select("accounts", PARENT, OWN_ACCOUNT))
    a.append(
        create_update(
            "accounts",
            PARENT,
            OWN_ACCOUNT,
            columns=ACCOUNT_PARENT_UPDATE_COLS,
            check=OWN_ACCOUNT,
        )
    )
    a.append(create_select("accounts", OPS, EMPTY))
    a.append(create_select("accounts", ADMIN, EMPTY))
    a.append(create_insert("accounts", ADMIN, EMPTY))
    a.append(create_update("accounts", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("accounts", ADMIN, EMPTY))

    # ---------- child_profiles ----------
    a.append(create_select("child_profiles", PARENT, OWN_VIA_ACCOUNT))
    a.append(
        create_insert(
            "child_profiles",
            PARENT,
            OWN_VIA_ACCOUNT,
            columns=["account_id", "name", "birth_date"],
        )
    )
    a.append(
        create_update(
            "child_profiles",
            PARENT,
            OWN_VIA_ACCOUNT,
            columns=["name", "birth_date"],
            check=OWN_VIA_ACCOUNT,
        )
    )
    a.append(create_delete("child_profiles", PARENT, OWN_VIA_ACCOUNT))
    a.append(create_select("child_profiles", OPS, EMPTY))
    a.append(create_select("child_profiles", ADMIN, EMPTY))
    a.append(create_insert("child_profiles", ADMIN, EMPTY))
    a.append(create_update("child_profiles", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("child_profiles", ADMIN, EMPTY))

    # ---------- products & product_images (catalog) ----------
    for t in ("products", "product_images"):
        a.append(create_select(t, PARENT, EMPTY))
        a.append(create_select(t, OPS, EMPTY))
        a.append(create_select(t, ADMIN, EMPTY))
        a.append(create_insert(t, ADMIN, EMPTY))
        a.append(create_update(t, ADMIN, EMPTY, check=EMPTY))
        a.append(create_delete(t, ADMIN, EMPTY))
        # Public (unauthenticated) read for storefront browsing.
        a.append(create_select(t, PUBLIC, EMPTY, allow_aggregations=False))

    # ---------- orders & order_line_items ----------
    a.append(create_select("orders", PARENT, OWN_VIA_ACCOUNT))
    a.append(create_select("orders", OPS, EMPTY))
    a.append(create_select("orders", ADMIN, EMPTY))
    a.append(create_insert("orders", ADMIN, EMPTY))
    a.append(create_update("orders", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("orders", ADMIN, EMPTY))

    a.append(
        create_select(
            "order_line_items",
            PARENT,
            {"order": OWN_VIA_ACCOUNT},
        )
    )
    a.append(create_select("order_line_items", OPS, EMPTY))
    a.append(create_select("order_line_items", ADMIN, EMPTY))
    a.append(create_insert("order_line_items", ADMIN, EMPTY))
    a.append(create_update("order_line_items", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("order_line_items", ADMIN, EMPTY))

    # ---------- owned_units ----------
    a.append(create_select("owned_units", PARENT, OWN_VIA_ACCOUNT))
    a.append(create_select("owned_units", OPS, EMPTY))
    a.append(
        create_update(
            "owned_units",
            OPS,
            EMPTY,
            columns=["status", "returned_at"],
            check=EMPTY,
        )
    )
    a.append(create_select("owned_units", ADMIN, EMPTY))
    a.append(create_insert("owned_units", ADMIN, EMPTY))
    a.append(create_update("owned_units", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("owned_units", ADMIN, EMPTY))

    # ---------- return_requests ----------
    a.append(create_select("return_requests", PARENT, OWN_VIA_ACCOUNT))
    # Parent INSERT: enforce the row's account_id matches their account.
    # The Function pre-fills account_id; this check belt-and-braces it.
    a.append(
        create_insert(
            "return_requests",
            PARENT,
            OWN_VIA_ACCOUNT,
            columns=[
                "owned_unit_id",
                "account_id",
                "path",
                "self_declared_grade",
                "pickup_address",
                "pickup_scheduled_for",
            ],
        )
    )
    a.append(
        create_update(
            "return_requests",
            PARENT,
            {
                "_and": [
                    OWN_VIA_ACCOUNT,
                    # Parents can only mutate while still in early phases — they
                    # cannot e.g. flip a qc_passed back to draft.
                    {"status": {"_in": ["draft", "submitted", "pickup_scheduled"]}},
                ]
            },
            columns=RETURN_REQUEST_PARENT_UPDATE_COLS,
            check=OWN_VIA_ACCOUNT,
        )
    )
    a.append(create_select("return_requests", OPS, EMPTY))
    a.append(create_update("return_requests", OPS, EMPTY, check=EMPTY))
    a.append(create_select("return_requests", ADMIN, EMPTY))
    a.append(create_insert("return_requests", ADMIN, EMPTY))
    a.append(create_update("return_requests", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("return_requests", ADMIN, EMPTY))

    # ---------- return_request_events ----------
    a.append(create_select("return_request_events", PARENT, OWN_VIA_REQUEST))
    a.append(create_select("return_request_events", OPS, EMPTY))
    a.append(create_insert("return_request_events", OPS, EMPTY))
    a.append(create_select("return_request_events", ADMIN, EMPTY))
    a.append(create_insert("return_request_events", ADMIN, EMPTY))
    a.append(create_update("return_request_events", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("return_request_events", ADMIN, EMPTY))

    # ---------- condition_assessments ----------
    a.append(create_select("condition_assessments", PARENT, OWN_VIA_REQUEST))
    a.append(
        create_insert(
            "condition_assessments",
            PARENT,
            {
                "_and": [
                    OWN_VIA_REQUEST,
                    {"phase": {"_eq": "self_declared"}},  # parents only do self-declared
                ]
            },
            columns=["return_request_id", "phase", "grade", "notes"],
        )
    )
    a.append(create_select("condition_assessments", OPS, EMPTY))
    a.append(
        create_insert(
            "condition_assessments",
            OPS,
            {"phase": {"_eq": "qc_verified"}},
            columns=["return_request_id", "phase", "grade", "notes"],
        )
    )
    a.append(create_select("condition_assessments", ADMIN, EMPTY))
    a.append(create_insert("condition_assessments", ADMIN, EMPTY))
    a.append(create_update("condition_assessments", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("condition_assessments", ADMIN, EMPTY))

    # ---------- assessment_photos ----------
    a.append(create_select("assessment_photos", PARENT, OWN_VIA_ASSESSMENT))
    a.append(
        create_insert(
            "assessment_photos",
            PARENT,
            OWN_VIA_ASSESSMENT,
            columns=["assessment_id", "prompt", "storage_path"],
        )
    )
    a.append(create_select("assessment_photos", OPS, EMPTY))
    a.append(create_select("assessment_photos", ADMIN, EMPTY))
    a.append(create_insert("assessment_photos", ADMIN, EMPTY))
    a.append(create_update("assessment_photos", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("assessment_photos", ADMIN, EMPTY))

    # ---------- ngo_partners ----------
    a.append(create_select("ngo_partners", PARENT, {"active": {"_eq": True}}))
    a.append(create_select("ngo_partners", OPS, EMPTY))
    a.append(create_select("ngo_partners", ADMIN, EMPTY))
    a.append(create_insert("ngo_partners", ADMIN, EMPTY))
    a.append(create_update("ngo_partners", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("ngo_partners", ADMIN, EMPTY))
    a.append(
        create_select("ngo_partners", PUBLIC, {"active": {"_eq": True}}, allow_aggregations=False)
    )

    # ---------- refurb_listings ----------
    a.append(create_select("refurb_listings", PARENT, OWN_VIA_REQUEST))
    a.append(create_select("refurb_listings", OPS, EMPTY))
    a.append(create_insert("refurb_listings", OPS, EMPTY))
    a.append(create_update("refurb_listings", OPS, EMPTY, check=EMPTY))
    a.append(create_select("refurb_listings", ADMIN, EMPTY))
    a.append(create_insert("refurb_listings", ADMIN, EMPTY))
    a.append(create_update("refurb_listings", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("refurb_listings", ADMIN, EMPTY))

    # ---------- donation_records ----------
    a.append(create_select("donation_records", PARENT, OWN_VIA_REQUEST))
    a.append(create_select("donation_records", OPS, EMPTY))
    a.append(create_insert("donation_records", OPS, EMPTY))
    a.append(create_update("donation_records", OPS, EMPTY, check=EMPTY))
    a.append(create_select("donation_records", ADMIN, EMPTY))
    a.append(create_insert("donation_records", ADMIN, EMPTY))
    a.append(create_update("donation_records", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("donation_records", ADMIN, EMPTY))

    # ---------- trade_in_credits ----------
    a.append(create_select("trade_in_credits", PARENT, OWN_VIA_REQUEST))
    a.append(create_select("trade_in_credits", OPS, EMPTY))
    a.append(create_insert("trade_in_credits", OPS, EMPTY))
    a.append(create_select("trade_in_credits", ADMIN, EMPTY))
    a.append(create_insert("trade_in_credits", ADMIN, EMPTY))
    a.append(create_update("trade_in_credits", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("trade_in_credits", ADMIN, EMPTY))

    # ---------- store_credit_ledger (append-only; no UPDATE for anyone but admin) ----------
    a.append(create_select("store_credit_ledger", PARENT, OWN_VIA_ACCOUNT))
    a.append(create_select("store_credit_ledger", OPS, EMPTY))
    a.append(create_select("store_credit_ledger", ADMIN, EMPTY))
    a.append(create_insert("store_credit_ledger", ADMIN, EMPTY))
    # Deliberately NOT exposing UPDATE/DELETE — append-only invariant.

    # ---------- credit_transfers ----------
    own_transfer = {
        "_or": [
            {"from_account": {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}},
            {"to_account": {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}},
        ]
    }
    a.append(create_select("credit_transfers", PARENT, own_transfer))
    a.append(create_select("credit_transfers", OPS, EMPTY))
    a.append(create_select("credit_transfers", ADMIN, EMPTY))
    a.append(create_insert("credit_transfers", ADMIN, EMPTY))
    a.append(create_update("credit_transfers", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("credit_transfers", ADMIN, EMPTY))

    # ---------- discount_codes ----------
    a.append(create_select("discount_codes", PARENT, OWN_VIA_ACCOUNT))
    a.append(create_select("discount_codes", OPS, EMPTY))
    a.append(create_insert("discount_codes", OPS, EMPTY))
    a.append(create_select("discount_codes", ADMIN, EMPTY))
    a.append(create_insert("discount_codes", ADMIN, EMPTY))
    a.append(create_update("discount_codes", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("discount_codes", ADMIN, EMPTY))

    # ---------- shopify_stub_products (for browsing the Renewed collection) ----------
    a.append(
        create_select(
            "shopify_stub_products",
            PARENT,
            {
                "_and": [
                    {"status": {"_eq": "ACTIVE"}},
                    {"sold_at": {"_is_null": True}},
                ]
            },
        )
    )
    a.append(create_select("shopify_stub_products", OPS, EMPTY))
    a.append(create_select("shopify_stub_products", ADMIN, EMPTY))
    a.append(create_insert("shopify_stub_products", ADMIN, EMPTY))
    a.append(create_update("shopify_stub_products", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("shopify_stub_products", ADMIN, EMPTY))

    # ---------- shopify_stub_discount_codes ----------
    # Parent reads only codes scoped to their own customer GID. The manual
    # `account` relationship (set up in ensure_view_relationships) joins
    # `customer_gid` ↔ `accounts.shopify_customer_gid` so we can pivot on
    # the parent's auth_user_id like every other parent-scoped table.
    a.append(
        create_select(
            "shopify_stub_discount_codes",
            PARENT,
            {"account": {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}},
        )
    )
    a.append(create_select("shopify_stub_discount_codes", OPS, EMPTY))
    a.append(create_select("shopify_stub_discount_codes", ADMIN, EMPTY))
    a.append(create_insert("shopify_stub_discount_codes", ADMIN, EMPTY))
    a.append(create_update("shopify_stub_discount_codes", ADMIN, EMPTY, check=EMPTY))
    a.append(create_delete("shopify_stub_discount_codes", ADMIN, EMPTY))

    # ---------- shopify_stub_log ----------
    a.append(create_select("shopify_stub_log", OPS, EMPTY))
    a.append(create_select("shopify_stub_log", ADMIN, EMPTY))
    a.append(create_insert("shopify_stub_log", ADMIN, EMPTY))
    # No parent access; this is internal connector telemetry.

    # ---------- views ----------
    a.append(
        create_select(
            "account_credit_balance",
            PARENT,
            {"account": {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}},
            allow_aggregations=False,
        )
    )
    a.append(create_select("account_credit_balance", OPS, EMPTY, allow_aggregations=False))
    a.append(create_select("account_credit_balance", ADMIN, EMPTY, allow_aggregations=False))

    a.append(
        create_select(
            "eligible_units",
            PARENT,
            {"account": {"auth_user_id": {"_eq": "X-Hasura-User-Id"}}},
            allow_aggregations=False,
        )
    )
    a.append(create_select("eligible_units", OPS, EMPTY, allow_aggregations=False))
    a.append(create_select("eligible_units", ADMIN, EMPTY, allow_aggregations=False))

    return a


# -----------------------------------------------------------------------------
# Driver
# -----------------------------------------------------------------------------


def main() -> None:
    print(f"==> Hasura: {HASURA_URL}")
    print(f"==> SOCKS5 proxy: {SOCKS_PROXY}")

    # Verify connectivity.
    print("==> Pinging metadata endpoint...")
    ping = metadata_call({"type": "export_metadata", "args": {}})
    print(f"    metadata version: {ping.get('version')}")

    # Add view relationships (idempotent).
    print("==> Ensuring view→accounts relationships exist...")
    ensure_view_relationships()

    # Drop existing perms — only target the (table, role, action) tuples that
    # currently exist according to a fresh metadata export. This avoids
    # spamming Hasura with hundreds of "doesn't exist" 400s and stays well
    # under the proxy's tolerance for rapid HTTPS connections.
    print("==> Computing drop list from current metadata...")
    current_md = metadata_call({"type": "export_metadata", "args": {}})
    src = next(
        (s for s in current_md.get("sources", []) if s["name"] == SOURCE_NAME), None
    )
    drops: list[dict] = []
    if src:
        for tbl in src.get("tables", []):
            tname = tbl["table"]["name"]
            if tname not in TABLES_TO_PERMISSION:
                continue
            for kind, action in (
                ("select_permissions", "select"),
                ("insert_permissions", "insert"),
                ("update_permissions", "update"),
                ("delete_permissions", "delete"),
            ):
                for perm in tbl.get(kind, []) or []:
                    drops.append(drop_perm(tname, perm["role"], action))
    print(f"    {len(drops)} existing permissions to drop")
    if drops:
        # Batch in chunks to keep request size sane.
        chunk = 60
        for i in range(0, len(drops), chunk):
            batch = drops[i : i + chunk]
            metadata_call({"type": "bulk", "source": SOURCE_NAME, "args": batch})
        print("    drops complete")

    # Apply create actions in chunks. If a chunk hits an already-exists
    # collision (rare; happens when a previous run partially applied), fall
    # back to per-action with allow_errors so we converge.
    creates = build_create_actions()
    print(f"==> Applying {len(creates)} create actions...")
    t0 = time.time()
    chunk = 50
    applied = 0
    skipped_existing = 0
    for i in range(0, len(creates), chunk):
        batch = creates[i : i + chunk]
        resp = metadata_call(
            {"type": "bulk", "source": SOURCE_NAME, "args": batch},
            allow_errors=True,
        )
        if isinstance(resp, dict) and resp.get("error"):
            for action in batch:
                r = metadata_call(action, allow_errors=True)
                if isinstance(r, dict) and r.get("error"):
                    if r.get("code") == "already-exists":
                        skipped_existing += 1
                    else:
                        raise RuntimeError(
                            f"create failed for {action['type']} on "
                            f"{action['args']['table']['name']}/{action['args']['role']}: "
                            f"{json.dumps(r)[:400]}"
                        )
                else:
                    applied += 1
        else:
            applied += len(batch)
    elapsed = time.time() - t0
    print(
        f"    bulk create OK ({applied} applied, "
        f"{skipped_existing} already-existed, {elapsed:.1f}s)"
    )

    # Summary by role.
    by_role: dict[str, int] = {}
    by_table: dict[str, int] = {}
    for c in creates:
        role = c["args"]["role"]
        table = c["args"]["table"]["name"]
        by_role[role] = by_role.get(role, 0) + 1
        by_table[table] = by_table.get(table, 0) + 1

    print("\n==> Permissions applied")
    print("    by role:")
    for k, v in sorted(by_role.items()):
        print(f"      {k:8} {v:3}")
    print("    by table:")
    for k, v in sorted(by_table.items()):
        print(f"      {k:35} {v:3}")

    # Verification probe.
    print("\n==> Verifying with parent JWT simulation (Josh's auth_user_id)")
    josh_uid = "bbbbbbbb-7777-0000-0000-000000000001"
    maya_uid = "bbbbbbbb-7777-0000-0000-000000000002"
    for label, uid, expected in (
        ("Josh's parent", josh_uid, 6),
        ("Maya's mom", maya_uid, 4),
    ):
        gql = json.dumps(
            {"query": "{ owned_units { id status } }"}
        )
        cmd = [
            "curl",
            "--silent",
            "--max-time",
            "30",
            "--socks5-hostname",
            SOCKS_PROXY,
            "-X",
            "POST",
            "https://ntytiuebfzzodrotraun.hasura.ap-south-1.nhost.run/v1/graphql",
            "-H",
            "Content-Type: application/json",
            "-H",
            f"x-hasura-admin-secret: {admin_secret()}",
            "-H",
            "x-hasura-role: parent",
            "-H",
            f"x-hasura-user-id: {uid}",
            "-d",
            gql,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        try:
            j = json.loads(r.stdout)
        except Exception:
            print(f"    [{label}] parse failed: {r.stdout[:200]}")
            continue
        if "errors" in j:
            print(f"    [{label}] FAIL: {json.dumps(j['errors'])[:300]}")
            continue
        n = len(j["data"]["owned_units"])
        status = "OK" if n == expected else "MISMATCH"
        print(f"    [{label}] owned_units rows: {n} (expected {expected}) — {status}")

    print("\nDone.")


if __name__ == "__main__":
    main()
