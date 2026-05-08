# ER Diagram

Renders in any GitHub markdown viewer or Mermaid live editor.

```mermaid
erDiagram
    accounts ||--o{ child_profiles : has
    accounts ||--o{ orders : places
    accounts ||--o{ owned_units : owns
    accounts ||--o{ return_requests : initiates
    accounts ||--o{ store_credit_ledger : has
    accounts ||--o{ discount_codes : holds
    accounts ||--o{ credit_transfers : "sends/receives"

    products ||--o{ product_images : has
    products ||--o{ order_line_items : "appears in"
    products ||--o{ owned_units : "instantiated as"
    products ||--o{ refurb_listings : "templated by"

    orders ||--o{ order_line_items : contains
    order_line_items ||--o{ owned_units : expands_to

    owned_units ||--o| return_requests : "may have one open"

    return_requests ||--o{ return_request_events : logs
    return_requests ||--o{ condition_assessments : has
    return_requests ||--o| refurb_listings : "may produce"
    return_requests ||--o| donation_records : "may produce"
    return_requests ||--o| trade_in_credits : "may produce"

    condition_assessments ||--o{ assessment_photos : has

    ngo_partners ||--o{ donation_records : receives

    refurb_listings ||--o{ store_credit_ledger : "credits parent"
    trade_in_credits ||--o{ store_credit_ledger : "credits parent"
    donation_records ||--o{ discount_codes : "rewards parent"

    credit_transfers ||--|| store_credit_ledger : "creates two rows"

    accounts {
        uuid id PK
        uuid auth_user_id FK
        text display_name
        text phone
        jsonb default_address
    }

    products {
        uuid id PK
        text shopify_product_id UK
        text title
        integer price_inr
        integer min_age_months
        integer max_age_months
        text category
    }

    owned_units {
        uuid id PK
        uuid account_id FK
        uuid product_id FK
        uuid order_line_item_id FK
        timestamptz acquired_at
        text status
    }

    return_requests {
        uuid id PK
        uuid owned_unit_id FK
        uuid account_id FK
        text path
        text status
        text self_declared_grade
        jsonb pickup_address
        timestamptz pickup_scheduled_for
    }

    condition_assessments {
        uuid id PK
        uuid return_request_id FK
        text phase
        text grade
        text notes
    }

    refurb_listings {
        uuid id PK
        uuid return_request_id FK
        uuid original_product_id FK
        text condition_grade
        integer listed_price_inr
        text shopify_renewed_product_id
    }

    donation_records {
        uuid id PK
        uuid return_request_id FK
        uuid ngo_partner_id FK
        text impact_certificate_url
        text ngo_update_message
    }

    trade_in_credits {
        uuid id PK
        uuid return_request_id FK
        integer credit_amount_inr
        timestamptz expires_at
    }

    store_credit_ledger {
        uuid id PK
        uuid account_id FK
        integer amount_inr
        text source_type
        uuid source_id
        timestamptz expires_at
    }

    credit_transfers {
        uuid id PK
        uuid from_account_id FK
        uuid to_account_id FK
        integer amount_inr
        text message
    }

    discount_codes {
        uuid id PK
        uuid account_id FK
        text code UK
        integer discount_pct
        timestamptz expires_at
    }

    ngo_partners {
        uuid id PK
        text name
        text description
        boolean has_80g_status
    }
```

## State machine (return_requests.status)

```mermaid
stateDiagram-v2
    [*] --> draft : parent starts
    draft --> submitted : parent confirms path + pickup
    submitted --> pickup_scheduled : courier slot booked
    pickup_scheduled --> in_transit : courier picks up (QR scan)
    in_transit --> received : warehouse receiving
    received --> qc_passed : ops confirms self-declared grade
    received --> qc_downgraded : ops downgrades, parent must accept
    received --> qc_failed : unfit; recycle or return-to-sender
    qc_downgraded --> qc_passed : parent accepts new terms
    qc_downgraded --> cancelled : parent rejects
    qc_passed --> completed : credit issued / listing created / donation logged
    qc_failed --> completed : recycle path
    submitted --> cancelled : parent cancels
    pickup_scheduled --> cancelled : parent cancels
```
