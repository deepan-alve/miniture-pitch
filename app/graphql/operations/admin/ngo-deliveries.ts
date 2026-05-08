import { gql } from '@apollo/client';

// NGO deliveries waiting for ops to mark them physically delivered.
//
// We watch via subscription so the ops dashboard stays live without manual
// refresh. The "days waiting" rendering is computed client-side from
// return_request.created_at.

export const ADMIN_NGO_DELIVERIES_SUBSCRIPTION = gql`
  subscription AdminNgoDeliveries {
    donation_records(
      where: { delivered_to_ngo_at: { _is_null: true } }
      order_by: { return_request: { created_at: asc } }
    ) {
      id
      delivered_to_ngo_at
      impact_certificate_url
      ngo_partner {
        id
        name
        logo_url
      }
      return_request {
        id
        created_at
        account {
          id
          display_name
        }
        owned_unit {
          id
          product {
            id
            title
            hero_image_url
          }
        }
      }
    }
  }
`;

export type AdminNgoDelivery = {
  id: string;
  delivered_to_ngo_at: string | null;
  impact_certificate_url: string | null;
  ngo_partner: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  return_request: {
    id: string;
    created_at: string;
    account: {
      id: string;
      display_name: string;
    };
    owned_unit: {
      id: string;
      product: {
        id: string;
        title: string;
        hero_image_url: string | null;
      };
    };
  };
};

export type AdminNgoDeliveriesData = {
  donation_records: AdminNgoDelivery[];
};

// History of recently completed deliveries (delivered_to_ngo_at IS NOT NULL).
// Shown below the pending ones so the demo screen never looks empty.

export const ADMIN_NGO_RECENT_QUERY = gql`
  query AdminNgoRecent {
    donation_records(
      where: { delivered_to_ngo_at: { _is_null: false } }
      order_by: { delivered_to_ngo_at: desc }
      limit: 8
    ) {
      id
      delivered_to_ngo_at
      impact_certificate_url
      ngo_partner {
        id
        name
      }
      return_request {
        id
        account {
          display_name
        }
        owned_unit {
          product {
            title
          }
        }
      }
    }
  }
`;

// Marks a donation as delivered. In production this is a `confirm-donation`
// Function that uploads the impact certificate PDF to Storage and stamps
// the row. Here we approximate: stamp delivered_to_ngo_at + a generated
// stub certificate URL + an event row.

export const ADMIN_CONFIRM_DONATION_MUTATION = gql`
  mutation AdminConfirmDonation(
    $donation_id: uuid!
    $return_request_id: uuid!
    $owned_unit_id: uuid!
    $impact_certificate_url: String!
    $event_payload: jsonb!
  ) {
    update_donation_records_by_pk(
      pk_columns: { id: $donation_id }
      _set: {
        delivered_to_ngo_at: "now()"
        impact_certificate_url: $impact_certificate_url
      }
    ) {
      id
      delivered_to_ngo_at
      impact_certificate_url
    }
    insert_return_request_events_one(
      object: {
        return_request_id: $return_request_id
        event_type: "donation_delivered"
        payload: $event_payload
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
      _set: { status: "completed" }
    ) {
      id
      status
    }
  }
`;
