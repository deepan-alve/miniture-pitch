import { gql } from '@apollo/client';

// Single return request detail for the QC review screen.
// We pull both phases of `condition_assessments` (self-declared and any
// existing qc_verified) plus the event timeline so the admin sees the full
// history at a glance.

export const ADMIN_QC_DETAIL_QUERY = gql`
  query AdminQcDetail($id: uuid!) {
    return_requests_by_pk(id: $id) {
      id
      status
      path
      self_declared_grade
      created_at
      pickup_scheduled_for
      pickup_address
      account {
        id
        display_name
        phone
      }
      owned_unit {
        id
        acquired_at
        product {
          id
          title
          hero_image_url
          price_inr
          category
        }
      }
      condition_assessments(order_by: { created_at: asc }) {
        id
        phase
        grade
        notes
        created_at
        assessment_photos {
          id
          prompt
          storage_path
        }
      }
      return_request_events(order_by: { created_at: asc }) {
        id
        event_type
        payload
        created_at
        actor_account_id
      }
    }
  }
`;

export type AdminQcDetailData = {
  return_requests_by_pk: {
    id: string;
    status: string;
    path: 'refurb' | 'trade_in' | 'donate';
    self_declared_grade: string | null;
    created_at: string;
    pickup_scheduled_for: string | null;
    pickup_address: Record<string, unknown> | null;
    account: {
      id: string;
      display_name: string;
      phone: string | null;
    };
    owned_unit: {
      id: string;
      acquired_at: string;
      product: {
        id: string;
        title: string;
        hero_image_url: string | null;
        price_inr: number;
        category: string;
      };
    };
    condition_assessments: {
      id: string;
      phase: 'self_declared' | 'qc_verified';
      grade: 'good' | 'fair' | 'worn' | 'unfit';
      notes: string | null;
      created_at: string;
      assessment_photos: {
        id: string;
        prompt: string;
        storage_path: string;
      }[];
    }[];
    return_request_events: {
      id: string;
      event_type: string;
      payload: Record<string, unknown> | null;
      created_at: string;
      actor_account_id: string | null;
    }[];
  } | null;
};
