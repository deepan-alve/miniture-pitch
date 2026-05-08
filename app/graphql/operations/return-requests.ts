import { gql } from '@apollo/client';

// Return-request mutations + the live subscription that drives the
// status timeline screen.

export const INSERT_RETURN_REQUEST_MUTATION = gql`
  mutation InsertReturnRequest(
    $ownedUnitId: uuid!
    $accountId: uuid!
    $path: return_path!
    $grade: condition_grade!
    $pickupAddress: jsonb
    $pickupScheduledFor: timestamptz!
  ) {
    insert_return_requests_one(
      object: {
        owned_unit_id: $ownedUnitId
        account_id: $accountId
        path: $path
        self_declared_grade: $grade
        pickup_address: $pickupAddress
        pickup_scheduled_for: $pickupScheduledFor
        status: "submitted"
        condition_assessments: {
          data: [{ phase: "self_declared", grade: $grade }]
        }
        return_request_events: {
          data: [
            { event_type: "submitted", actor_account_id: $accountId, payload: {} }
            { event_type: "pickup_scheduled", actor_account_id: $accountId }
          ]
        }
      }
    ) {
      id
      status
      path
      pickup_scheduled_for
    }
  }
`;

export const RETURN_REQUEST_TIMELINE_SUBSCRIPTION = gql`
  subscription ReturnRequestTimeline($id: uuid!) {
    return_requests_by_pk(id: $id) {
      id
      status
      path
      self_declared_grade
      pickup_scheduled_for
      pickup_qr_code
      created_at
      updated_at
      owned_unit {
        id
        product {
          id
          title
          hero_image_url
          price_inr
        }
      }
      return_request_events(order_by: { created_at: asc }) {
        id
        event_type
        payload
        created_at
      }
    }
  }
`;

export const RETURN_REQUEST_DETAIL_QUERY = gql`
  query ReturnRequestDetail($id: uuid!) {
    return_requests_by_pk(id: $id) {
      id
      status
      path
      self_declared_grade
      pickup_scheduled_for
      pickup_qr_code
      created_at
      owned_unit {
        id
        product {
          id
          title
          hero_image_url
          price_inr
        }
      }
      return_request_events(order_by: { created_at: asc }) {
        id
        event_type
        payload
        created_at
      }
    }
  }
`;
